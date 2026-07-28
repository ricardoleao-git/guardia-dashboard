"""
GuardIA Connector — Estado de ingestão por device, persistido.

Fecha o defeito #3 do `CLAUDE.md` §9. Antes desta versão, dedupe e fila
viviam em `OrderedDict`: o connector reiniciando perdia os dois, e o
`CacheEventEnable` do §4.2 — que faz o device reentregar depois de queda de
rede ou energia — produzia linha duplicada no core.

Cada device tem estado isolado: um device lento ou fora do ar não trava os
outros. O que mudou é onde esse estado mora — ver `ingest_store.py`, que
também explica por que o arquivo SQLite não é tabela do produto e não esbarra
na PND-16.

A API pública de `DedupeCache`, `RetryQueue`, `DeviceState` e
`IngestStateManager` foi preservada: `push_receiver.py`, `mqtt_receiver.py` e
`receiver_main.py` não mudam.
"""
import time
from typing import Callable, Dict, List, Optional

from loguru import logger

from canonical_events import CanonicalEvent
from ingest_store import IngestStore, QueuedEvent, SqliteIngestStore


class DedupeCache:
    """
    Dedupe por `(device_serial, event_key)` — a composição que o `CORE-01` §4
    documenta para `dedupe_key`.

    A `event_key` é o `event_id` do evento canônico, que por sua vez vem de
    `p6s_event_translator.stable_event_id()`: id do device quando existe, hash
    do payload quando não. Isso é o que faz a reentrega do §4.2 casar com a
    entrega original.

    Expurgo por idade e por tamanho continua existindo, agora no store.
    """

    def __init__(
        self,
        store: IngestStore,
        device_serial: str,
        max_size: int = 5000,
        ttl_seconds: int = 3600,
    ):
        self.store = store
        self.device_serial = device_serial
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds

    def is_duplicate(self, event_id: str, now: Optional[float] = None) -> bool:
        now = now if now is not None else time.time()
        # Expurga antes de checar: chave vencida não deve marcar duplicata.
        self.store.purge_dedupe(now - self.ttl_seconds, self.max_size)
        return self.store.mark_seen(self.device_serial, event_id, now)

    def count(self) -> int:
        return self.store.dedupe_count(self.device_serial)


class RetryQueue:
    """
    Fila de entrega ao GuardIA Core, persistida, com retry exponencial.

    Backoff: `base_seconds * 2^attempts`, limitado a `max_backoff_seconds`.
    Esgotadas as tentativas, o item vira dead-letter **no disco** — antes era
    um dict que morria com o processo, o que contrariava o §14.7.3 (nada de
    perda muda).
    """

    def __init__(
        self,
        store: IngestStore,
        device_serial: str,
        base_seconds: float = 2.0,
        max_backoff_seconds: float = 300.0,
        max_attempts: int = 8,
    ):
        self.store = store
        self.device_serial = device_serial
        self.base_seconds = base_seconds
        self.max_backoff_seconds = max_backoff_seconds
        self.max_attempts = max_attempts

    def enqueue(self, event: CanonicalEvent, now: Optional[float] = None) -> None:
        now = now if now is not None else time.time()
        self.store.enqueue(
            self.device_serial, event.event_id, event.to_core_payload(), now
        )

    def _backoff_for(self, attempts: int) -> float:
        return min(self.base_seconds * (2 ** attempts), self.max_backoff_seconds)

    def process_due(
        self,
        deliver: Callable[[CanonicalEvent], bool],
        now: Optional[float] = None,
    ) -> int:
        """Tenta entregar os itens vencidos deste device. Retorna quantos saíram."""
        now = now if now is not None else time.time()
        delivered = 0
        for item in self.store.due_items(now):
            if item.device_serial != self.device_serial:
                continue
            event = CanonicalEvent.from_core_payload(item.payload)
            ok = False
            try:
                ok = deliver(event)
            except Exception as e:
                logger.error(f"Falha ao entregar evento {item.event_id}: {e}")
            if ok:
                self.store.mark_delivered(item.device_serial, item.event_id)
                delivered += 1
                continue

            attempts = item.attempts + 1
            dead = attempts >= self.max_attempts
            if dead:
                logger.error(
                    f"Evento {item.event_id} esgotou {self.max_attempts} tentativas — "
                    "dead-letter (persistida, sobrevive a restart)."
                )
            self.store.mark_failed(
                item.device_serial,
                item.event_id,
                attempts,
                now + self._backoff_for(attempts),
                dead,
            )
        return delivered

    def pending_count(self) -> int:
        return self.store.pending_count(self.device_serial)

    @property
    def dead_letters(self) -> Dict[str, QueuedEvent]:
        """Compatível com o dict anterior: chaveado por `event_id`."""
        return {q.event_id: q for q in self.store.dead_letters(self.device_serial)}


class DeviceState:
    """Estado isolado de um device: dedupe, fila de retry, último Ack enviado."""

    def __init__(self, device_serial: str, store: IngestStore):
        self.device_serial = device_serial
        self.store = store
        self.dedupe = DedupeCache(store, device_serial)
        self.retry_queue = RetryQueue(store, device_serial)
        # Heartbeat e strategy são estado de sessão, não de entrega: perder no
        # restart é aceitável — o próximo heartbeat do device os reconstrói.
        self.last_heartbeat_at: Optional[float] = None
        self.last_strategy_sent: Optional[dict] = None


class IngestStateManager:
    """
    Registro de `DeviceState` por serial — cria sob demanda.

    Sem `store`, abre um SQLite no caminho default. Passar um store explícito
    é o que permite testar em `:memory:` e trocar por PostgreSQL depois.
    """

    def __init__(self, store: Optional[IngestStore] = None):
        self.store: IngestStore = store or SqliteIngestStore()
        self._devices: Dict[str, DeviceState] = {}

    def get_or_create(self, device_serial: str) -> DeviceState:
        if device_serial not in self._devices:
            self._devices[device_serial] = DeviceState(device_serial, self.store)
        return self._devices[device_serial]

    def all_devices(self) -> List[DeviceState]:
        return list(self._devices.values())

    def total_pending(self) -> int:
        return self.store.pending_count()
