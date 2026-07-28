"""
Testes da persistência do estado de ingestão e da retenção do payload bruto.

Dado sintético apenas (CLAUDE.md §10.6).
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import pytest

from ingest_store import (
    RAW_RETENTION_DAYS,
    RAW_RETENTION_SECONDS,
    SqliteIngestStore,
    purge_all,
)


@pytest.fixture
def store():
    s = SqliteIngestStore(":memory:")
    yield s
    s.close()


# ---------------------------------------------------------- dedupe atômico
def test_mark_seen_e_atomico(store):
    """Primeira chamada devolve False (novo); a segunda, True (já existia)."""
    assert store.mark_seen("D4", "k1", 100.0) is False
    assert store.mark_seen("D4", "k1", 101.0) is True


def test_mark_seen_nao_atualiza_o_seen_at(store):
    """
    INSERT OR IGNORE preserva o timestamp original — a janela de TTL conta do
    PRIMEIRO avistamento, senão um device barulhento mantém a chave viva para
    sempre e o expurgo nunca acontece.
    """
    store.mark_seen("D4", "k1", 100.0)
    store.mark_seen("D4", "k1", 5000.0)
    assert store.purge_dedupe(older_than=200.0, max_rows_per_device=999) == 1
    assert store.dedupe_count() == 0


def test_purge_dedupe_por_idade(store):
    store.mark_seen("D4", "velha", 100.0)
    store.mark_seen("D4", "nova", 900.0)
    assert store.purge_dedupe(older_than=500.0, max_rows_per_device=999) == 1
    assert store.dedupe_count("D4") == 1


def test_purge_dedupe_por_tamanho_mantem_as_recentes(store):
    for i in range(5):
        store.mark_seen("D4", f"k{i}", 100.0 + i)
    assert store.purge_dedupe(older_than=0.0, max_rows_per_device=2) == 3
    assert store.dedupe_count("D4") == 2
    # as duas mais recentes sobreviveram
    assert store.mark_seen("D4", "k4", 200.0) is True
    assert store.mark_seen("D4", "k0", 200.0) is False


def test_purge_por_tamanho_e_por_device(store):
    for i in range(4):
        store.mark_seen("D4", f"k{i}", 100.0 + i)
    store.mark_seen("D6", "unico", 100.0)
    store.purge_dedupe(older_than=0.0, max_rows_per_device=1)
    assert store.dedupe_count("D4") == 1
    assert store.dedupe_count("D6") == 1


# ------------------------------------------------------------------- fila
def test_enqueue_e_due_items(store):
    store.enqueue("D4", "E1", {"event_id": "E1"}, 100.0)
    assert [q.event_id for q in store.due_items(now=100.0)] == ["E1"]


def test_due_items_respeita_next_attempt_at(store):
    store.enqueue("D4", "E1", {"event_id": "E1"}, 0.0)
    store.mark_failed("D4", "E1", attempts=1, next_attempt_at=500.0, dead=False)
    assert store.due_items(now=100.0) == []
    assert len(store.due_items(now=600.0)) == 1


def test_dead_nao_volta_para_due(store):
    store.enqueue("D4", "E1", {"event_id": "E1"}, 0.0)
    store.mark_failed("D4", "E1", attempts=9, next_attempt_at=0.0, dead=True)
    assert store.due_items(now=1e9) == []
    assert [q.event_id for q in store.dead_letters("D4")] == ["E1"]


def test_enqueue_do_mesmo_id_nao_duplica_linha(store):
    store.enqueue("D4", "E1", {"v": 1}, 100.0)
    store.enqueue("D4", "E1", {"v": 2}, 101.0)
    assert store.pending_count("D4") == 1
    assert store.due_items(now=200.0)[0].payload == {"v": 2}


def test_due_items_ordena_por_chegada(store):
    store.enqueue("D4", "B", {}, 200.0)
    store.enqueue("D4", "A", {}, 100.0)
    assert [q.event_id for q in store.due_items(now=300.0)] == ["A", "B"]


# ---------------------------------------------------- payload bruto (CORE-05)
def test_prazo_do_bruto_e_o_do_core05():
    """
    CORE-05 §2 propõe 7 dias para `events.raw` ("vence antes do metadado").
    Se este assert cair, alguém mudou o prazo sem passar pela spec.
    """
    assert RAW_RETENTION_DAYS == 7
    assert RAW_RETENTION_SECONDS == 7 * 24 * 3600


def test_store_e_recupera_bruto(store):
    store.store_raw("D4", "E1", {"event_type": "face", "face_list": "Stranger"}, 100.0)
    assert store.get_raw("D4", "E1") == {"event_type": "face", "face_list": "Stranger"}


def test_bruto_inexistente_devolve_none(store):
    assert store.get_raw("D4", "nao-existe") is None


def test_purge_raw_por_prazo(store):
    agora = 1_000_000.0
    store.store_raw("D4", "antigo", {"x": 1}, agora - RAW_RETENTION_SECONDS - 10)
    store.store_raw("D4", "recente", {"x": 2}, agora - 3600)
    assert store.purge_raw(older_than=agora - RAW_RETENTION_SECONDS) == 1
    assert store.get_raw("D4", "antigo") is None
    assert store.get_raw("D4", "recente") == {"x": 2}


def test_purge_all_cobre_dedupe_e_bruto(store):
    agora = 1_000_000.0
    store.mark_seen("D4", "chave-velha", agora - 99_999)
    store.store_raw("D4", "bruto-velho", {"x": 1}, agora - RAW_RETENTION_SECONDS - 10)
    out = purge_all(store, now=agora, dedupe_ttl_seconds=3600)
    assert out == {"dedupe": 1, "raw": 1}


# ------------------------------------------------- o bruto guarda vocabulário
def test_bruto_pode_conter_vocabulario_de_fabricante(store):
    """
    O payload bruto é o ÚNICO lugar onde vocabulário P6S pode ficar: é a cópia
    do que o device mandou. A fronteira do §6 vale para o evento canônico e
    para o schema, não para o arquivo de depuração — e é por isso que ele tem
    prazo curto e próprio.
    """
    bruto = {"face_list": "WhiteList", "person_name": "Sintetico", "face_score": 91}
    store.store_raw("D4", "E1", bruto, 100.0)
    assert store.get_raw("D4", "E1") == bruto


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))
