"""
GuardIA Connector — persistência do estado de ingestão.

Fecha o defeito #3 do `CLAUDE.md` §9: sem isto, dedupe e fila de retry vivem
em memória e o connector reiniciando perde os dois. O §4.2 diz que
`CacheEventEnable` faz o device **retransmitir** depois de queda de rede ou
energia — exatamente o momento em que o connector também pode ter caído. Sem
dedupe persistente, a reentrega vira linha duplicada no core.

## Isto NÃO é tabela do produto

O arquivo SQLite é estado operacional **local do connector**, no mesmo espírito
do `services/connector` do monorepo, que já usa SQLite com WAL (`CORE-07`
§2.1). Não é schema do GuardIA, não vive em `db/`, e por isso não esbarra na
**PND-16** (nome da tabela de eventos e da coluna de tenancy). Quando o core
existir, o connector continua com o próprio arquivo — o que ele entrega ao
core é evento canônico, não a fila.

A interface `IngestStore` existe para que a troca por PostgreSQL seja de
adaptador, no mesmo padrão da camada de acesso a dados do front
(`client/src/lib/data/`, `CLAUDE.md` §3).
"""
import json
import sqlite3
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Protocol

from loguru import logger


@dataclass
class QueuedEvent:
    """Item da fila de entrega, como sai da persistência."""

    device_serial: str
    event_id: str
    payload: Dict[str, Any]
    attempts: int
    next_attempt_at: float
    enqueued_at: float


class IngestStore(Protocol):
    """
    Contrato de persistência do estado de ingestão.

    Três responsabilidades, deliberadamente juntas porque compartilham
    transação: dedupe, fila de entrega e retenção do payload bruto.
    """

    # --- dedupe -------------------------------------------------------
    def mark_seen(self, device_serial: str, event_key: str, now: float) -> bool:
        """
        Registra a chave e diz se ela **já existia**.

        `True` = duplicado (não processar). `False` = novo (fica registrado).
        Tem que ser atômico: dois pushes simultâneos do mesmo evento não podem
        ambos receber `False`.
        """
        ...

    def purge_dedupe(self, older_than: float, max_rows_per_device: int) -> int:
        """Expurga por idade e por tamanho. Retorna quantas linhas saíram."""
        ...

    def dedupe_count(self, device_serial: Optional[str] = None) -> int:
        ...

    # --- fila de entrega ----------------------------------------------
    def enqueue(
        self, device_serial: str, event_id: str, payload: Dict[str, Any], now: float
    ) -> None:
        ...

    def due_items(self, now: float, limit: int = 100) -> List[QueuedEvent]:
        """Itens vencidos e não mortos, mais antigos primeiro."""
        ...

    def mark_delivered(self, device_serial: str, event_id: str) -> None:
        ...

    def mark_failed(
        self,
        device_serial: str,
        event_id: str,
        attempts: int,
        next_attempt_at: float,
        dead: bool,
    ) -> None:
        ...

    def pending_count(self, device_serial: Optional[str] = None) -> int:
        ...

    def dead_letters(self, device_serial: Optional[str] = None) -> List[QueuedEvent]:
        ...

    # --- payload bruto -------------------------------------------------
    def store_raw(
        self, device_serial: str, event_id: str, raw: Dict[str, Any], now: float
    ) -> None:
        ...

    def get_raw(self, device_serial: str, event_id: str) -> Optional[Dict[str, Any]]:
        ...

    def purge_raw(self, older_than: float) -> int:
        ...


# Retenção do payload bruto — CORE-05 §2 (tabela de prazos):
#
#   | Payload bruto do evento (events.raw) | 7 dias | Vence antes do metadado.
#     Serve para depurar integração, não para operar |
#
# ⚠️ O próprio CORE-05 abre com: "Tudo neste arquivo é proposta técnica a
# validar juridicamente. Os prazos são pontos de partida defensáveis, não
# parecer." O prazo está amarrado a PND-10 e PND-11 (base legal por vertical e
# retenção do snapshot), as duas abertas. Então 7 dias é o default porque é o
# que a spec propõe — não porque esteja ratificado.
RAW_RETENTION_DAYS = 7
RAW_RETENTION_SECONDS = RAW_RETENTION_DAYS * 24 * 3600

_SCHEMA = """
CREATE TABLE IF NOT EXISTS dedupe (
  device_serial TEXT NOT NULL,
  event_key     TEXT NOT NULL,
  seen_at       REAL NOT NULL,
  PRIMARY KEY (device_serial, event_key)
);
CREATE INDEX IF NOT EXISTS idx_dedupe_seen_at ON dedupe(seen_at);

CREATE TABLE IF NOT EXISTS retry_queue (
  device_serial   TEXT NOT NULL,
  event_id        TEXT NOT NULL,
  payload         TEXT NOT NULL,
  attempts        INTEGER NOT NULL DEFAULT 0,
  next_attempt_at REAL    NOT NULL DEFAULT 0,
  dead            INTEGER NOT NULL DEFAULT 0,
  enqueued_at     REAL    NOT NULL,
  PRIMARY KEY (device_serial, event_id)
);
CREATE INDEX IF NOT EXISTS idx_retry_due ON retry_queue(dead, next_attempt_at);

CREATE TABLE IF NOT EXISTS raw_payloads (
  device_serial TEXT NOT NULL,
  event_id      TEXT NOT NULL,
  raw           TEXT NOT NULL,
  received_at   REAL NOT NULL,
  PRIMARY KEY (device_serial, event_id)
);
CREATE INDEX IF NOT EXISTS idx_raw_received ON raw_payloads(received_at);
"""


class SqliteIngestStore:
    """
    Implementação SQLite. `path=":memory:"` serve para teste.

    WAL para sobreviver a queda sem corromper, e `check_same_thread=False`
    porque o receptor HTTP roda em thread separada do loop de retry
    (`receiver_main.py`).
    """

    def __init__(self, path: str = "connector/state/ingest.db"):
        self.path = path
        if path != ":memory:":
            Path(path).parent.mkdir(parents=True, exist_ok=True)
        self._conn = sqlite3.connect(path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        if path != ":memory:":
            self._conn.execute("PRAGMA journal_mode=WAL")
        self._conn.execute("PRAGMA synchronous=NORMAL")
        self._conn.executescript(_SCHEMA)
        self._conn.commit()

    def close(self) -> None:
        self._conn.close()

    # --- dedupe -------------------------------------------------------
    def mark_seen(self, device_serial: str, event_key: str, now: float) -> bool:
        # INSERT OR IGNORE + rowcount é a checagem atômica: se a linha já
        # existia, rowcount é 0. Duas threads não podem ambas ver "novo".
        cur = self._conn.execute(
            "INSERT OR IGNORE INTO dedupe (device_serial, event_key, seen_at) VALUES (?,?,?)",
            (device_serial, event_key, now),
        )
        self._conn.commit()
        return cur.rowcount == 0

    def purge_dedupe(self, older_than: float, max_rows_per_device: int) -> int:
        cur = self._conn.execute("DELETE FROM dedupe WHERE seen_at < ?", (older_than,))
        removed = cur.rowcount
        # Expurgo por tamanho, por device: mantém as N mais recentes.
        for row in self._conn.execute(
            "SELECT device_serial, COUNT(*) c FROM dedupe GROUP BY device_serial"
        ).fetchall():
            if row["c"] > max_rows_per_device:
                cur = self._conn.execute(
                    "DELETE FROM dedupe WHERE device_serial = ? AND event_key IN ("
                    "  SELECT event_key FROM dedupe WHERE device_serial = ?"
                    "  ORDER BY seen_at DESC LIMIT -1 OFFSET ?)",
                    (row["device_serial"], row["device_serial"], max_rows_per_device),
                )
                removed += cur.rowcount
        self._conn.commit()
        return removed

    def dedupe_count(self, device_serial: Optional[str] = None) -> int:
        if device_serial is None:
            return self._conn.execute("SELECT COUNT(*) c FROM dedupe").fetchone()["c"]
        return self._conn.execute(
            "SELECT COUNT(*) c FROM dedupe WHERE device_serial = ?", (device_serial,)
        ).fetchone()["c"]

    # --- fila de entrega ----------------------------------------------
    def enqueue(
        self, device_serial: str, event_id: str, payload: Dict[str, Any], now: float
    ) -> None:
        self._conn.execute(
            "INSERT OR REPLACE INTO retry_queue "
            "(device_serial, event_id, payload, attempts, next_attempt_at, dead, enqueued_at) "
            "VALUES (?,?,?,0,0,0,?)",
            (device_serial, event_id, json.dumps(payload, ensure_ascii=False), now),
        )
        self._conn.commit()

    def _to_queued(self, r: sqlite3.Row) -> QueuedEvent:
        return QueuedEvent(
            device_serial=r["device_serial"],
            event_id=r["event_id"],
            payload=json.loads(r["payload"]),
            attempts=r["attempts"],
            next_attempt_at=r["next_attempt_at"],
            enqueued_at=r["enqueued_at"],
        )

    def due_items(self, now: float, limit: int = 100) -> List[QueuedEvent]:
        rows = self._conn.execute(
            "SELECT * FROM retry_queue WHERE dead = 0 AND next_attempt_at <= ? "
            "ORDER BY enqueued_at ASC LIMIT ?",
            (now, limit),
        ).fetchall()
        return [self._to_queued(r) for r in rows]

    def mark_delivered(self, device_serial: str, event_id: str) -> None:
        self._conn.execute(
            "DELETE FROM retry_queue WHERE device_serial = ? AND event_id = ?",
            (device_serial, event_id),
        )
        self._conn.commit()

    def mark_failed(
        self,
        device_serial: str,
        event_id: str,
        attempts: int,
        next_attempt_at: float,
        dead: bool,
    ) -> None:
        self._conn.execute(
            "UPDATE retry_queue SET attempts = ?, next_attempt_at = ?, dead = ? "
            "WHERE device_serial = ? AND event_id = ?",
            (attempts, next_attempt_at, 1 if dead else 0, device_serial, event_id),
        )
        self._conn.commit()

    def pending_count(self, device_serial: Optional[str] = None) -> int:
        if device_serial is None:
            return self._conn.execute(
                "SELECT COUNT(*) c FROM retry_queue WHERE dead = 0"
            ).fetchone()["c"]
        return self._conn.execute(
            "SELECT COUNT(*) c FROM retry_queue WHERE dead = 0 AND device_serial = ?",
            (device_serial,),
        ).fetchone()["c"]

    def dead_letters(self, device_serial: Optional[str] = None) -> List[QueuedEvent]:
        if device_serial is None:
            rows = self._conn.execute(
                "SELECT * FROM retry_queue WHERE dead = 1 ORDER BY enqueued_at"
            ).fetchall()
        else:
            rows = self._conn.execute(
                "SELECT * FROM retry_queue WHERE dead = 1 AND device_serial = ? "
                "ORDER BY enqueued_at",
                (device_serial,),
            ).fetchall()
        return [self._to_queued(r) for r in rows]

    # --- payload bruto -------------------------------------------------
    def store_raw(
        self, device_serial: str, event_id: str, raw: Dict[str, Any], now: float
    ) -> None:
        self._conn.execute(
            "INSERT OR REPLACE INTO raw_payloads "
            "(device_serial, event_id, raw, received_at) VALUES (?,?,?,?)",
            (device_serial, event_id, json.dumps(raw, ensure_ascii=False), now),
        )
        self._conn.commit()

    def get_raw(self, device_serial: str, event_id: str) -> Optional[Dict[str, Any]]:
        r = self._conn.execute(
            "SELECT raw FROM raw_payloads WHERE device_serial = ? AND event_id = ?",
            (device_serial, event_id),
        ).fetchone()
        return json.loads(r["raw"]) if r else None

    def purge_raw(self, older_than: float) -> int:
        cur = self._conn.execute(
            "DELETE FROM raw_payloads WHERE received_at < ?", (older_than,)
        )
        self._conn.commit()
        return cur.rowcount


def purge_all(store: IngestStore, now: Optional[float] = None, **kw) -> Dict[str, int]:
    """
    Job de expurgo. Chamado pelo loop do `receiver_main.py`.

    Espelha o job diário `purge` do CORE-01 §7 no que é responsabilidade do
    connector: o payload bruto. Mídia e metadado do evento são do core.
    """
    now = now if now is not None else time.time()
    dedupe_ttl = kw.get("dedupe_ttl_seconds", 3600)
    max_rows = kw.get("dedupe_max_per_device", 5000)
    raw_ttl = kw.get("raw_retention_seconds", RAW_RETENTION_SECONDS)

    out = {
        "dedupe": store.purge_dedupe(now - dedupe_ttl, max_rows),
        "raw": store.purge_raw(now - raw_ttl),
    }
    if out["dedupe"] or out["raw"]:
        logger.info(
            f"[purge] dedupe={out['dedupe']} linha(s), "
            f"raw={out['raw']} payload(s) além de {RAW_RETENTION_DAYS}d"
        )
    return out
