"""
Testes de dedupe e fila de retry — agora persistidos.

O que estes testes protegem é o defeito #3 do CLAUDE.md §9: o connector
reiniciando não pode perder dedupe nem fila, porque o `CacheEventEnable` do
§4.2 faz o device reentregar exatamente depois de uma queda.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import pytest

from canonical_events import CanonicalEvent, Correlation
from ingest_state import DedupeCache, IngestStateManager, RetryQueue
from ingest_store import SqliteIngestStore


@pytest.fixture
def store():
    s = SqliteIngestStore(":memory:")
    yield s
    s.close()


@pytest.fixture
def db_path(tmp_path):
    """Arquivo real: `:memory:` morre com a conexão e não testa restart."""
    return str(tmp_path / "ingest.db")


def _event(event_id="E1", device="D4"):
    return CanonicalEvent(
        event_id=event_id,
        event_type="face.unknown",
        device_serial=device,
        occurred_at="2026-07-28T10:00:00+00:00",
        received_at="2026-07-28T10:00:01+00:00",
        source_channel="http",
        correlation=Correlation(),
    )


# ---------------------------------------------------------------- dedupe
def test_dedupe_marca_segunda_ocorrencia_como_duplicata(store):
    cache = DedupeCache(store, "D4")
    assert cache.is_duplicate("E1") is False
    assert cache.is_duplicate("E1") is True


def test_dedupe_e_por_device(store):
    """Mesmo event_id em devices diferentes são eventos diferentes (CORE-01 §4)."""
    assert DedupeCache(store, "D4").is_duplicate("E1") is False
    assert DedupeCache(store, "D6").is_duplicate("E1") is False


def test_dedupe_evicta_por_tamanho(store):
    cache = DedupeCache(store, "D4", max_size=2, ttl_seconds=9999)
    cache.is_duplicate("A", now=100)
    cache.is_duplicate("B", now=101)
    cache.is_duplicate("C", now=102)   # expurga a mais antiga ("A")
    assert cache.is_duplicate("A", now=103) is False


def test_dedupe_evicta_por_ttl(store):
    cache = DedupeCache(store, "D4", ttl_seconds=60)
    cache.is_duplicate("E1", now=1000)
    assert cache.is_duplicate("E1", now=1030) is True    # dentro da janela
    assert cache.is_duplicate("E1", now=2000) is False   # venceu, reaparece novo


# ------------------------------------------------- persistência / restart
def test_dedupe_sobrevive_a_restart(db_path):
    s1 = SqliteIngestStore(db_path)
    assert DedupeCache(s1, "D4").is_duplicate("E1") is False
    s1.close()

    # "restart": processo novo, store novo, MESMO arquivo
    s2 = SqliteIngestStore(db_path)
    assert DedupeCache(s2, "D4").is_duplicate("E1") is True
    s2.close()


def test_evento_retransmitido_apos_restart_nao_duplica(db_path):
    """
    O cenário do §4.2: device reentrega por CacheEventEnable depois de uma
    queda que derrubou o connector também. Antes desta persistência, o segundo
    recebimento passava e virava linha duplicada no core.
    """
    entregues = []

    s1 = SqliteIngestStore(db_path)
    d1 = DedupeCache(s1, "D4")
    ev = _event("D4-evt-42")
    if not d1.is_duplicate(ev.event_id):
        entregues.append(ev.event_id)
    s1.close()

    s2 = SqliteIngestStore(db_path)          # restart
    d2 = DedupeCache(s2, "D4")
    if not d2.is_duplicate(ev.event_id):     # mesma ocorrência reentregue
        entregues.append(ev.event_id)
    s2.close()

    assert entregues == ["D4-evt-42"], f"entregue {len(entregues)}x — deveria ser 1"


def test_fila_pendente_sobrevive_a_restart(db_path):
    s1 = SqliteIngestStore(db_path)
    RetryQueue(s1, "D4").enqueue(_event("E1"))
    assert s1.pending_count("D4") == 1
    s1.close()

    s2 = SqliteIngestStore(db_path)          # restart
    q2 = RetryQueue(s2, "D4")
    assert q2.pending_count() == 1
    assert q2.process_due(deliver=lambda e: True) == 1
    assert q2.pending_count() == 0
    s2.close()


def test_dead_letter_sobrevive_a_restart(db_path):
    s1 = SqliteIngestStore(db_path)
    q1 = RetryQueue(s1, "D4", base_seconds=0, max_attempts=2)
    q1.enqueue(_event("E1"))
    q1.process_due(deliver=lambda e: False, now=0)
    q1.process_due(deliver=lambda e: False, now=0)
    assert "E1" in q1.dead_letters
    s1.close()

    s2 = SqliteIngestStore(db_path)          # restart
    assert "E1" in RetryQueue(s2, "D4").dead_letters
    s2.close()


def test_evento_volta_da_fila_com_a_forma_canonica(db_path):
    """A ida e volta pela fila não pode perder campo do payload canônico."""
    s = SqliteIngestStore(db_path)
    original = CanonicalEvent(
        event_id="E9", event_type="face.recognized", device_serial="D4",
        occurred_at="2026-07-28T10:00:00+00:00",
        received_at="2026-07-28T10:00:01+00:00",
        source_channel="mqtt",
        correlation=Correlation(face_uuid="aluno-1", group_id2="turma-6A"),
        attributes={"match_score": 91}, snapshot_ref="s3://x.jpg",
    )
    RetryQueue(s, "D4").enqueue(original)

    recebido = []
    RetryQueue(s, "D4").process_due(deliver=lambda e: recebido.append(e) or True)
    assert len(recebido) == 1
    assert recebido[0].to_core_payload() == original.to_core_payload()
    s.close()


# ---------------------------------------------------------------- retry
def test_retry_queue_entrega_com_sucesso_remove_da_fila(store):
    q = RetryQueue(store, "D4")
    q.enqueue(_event("E1"))
    assert q.process_due(deliver=lambda e: True) == 1
    assert q.pending_count() == 0


def test_retry_queue_backoff_ate_dead_letter(store):
    q = RetryQueue(store, "D4", base_seconds=0, max_attempts=2)
    q.enqueue(_event("E1"))
    q.process_due(deliver=lambda e: False, now=0)
    q.process_due(deliver=lambda e: False, now=0)
    assert q.pending_count() == 0
    assert "E1" in q.dead_letters


def test_retry_respeita_o_backoff(store):
    """Item que falhou não é tentado de novo antes de vencer o backoff."""
    q = RetryQueue(store, "D4", base_seconds=100, max_attempts=5)
    q.enqueue(_event("E1"), now=0)
    tentativas = []
    q.process_due(deliver=lambda e: tentativas.append(1) or False, now=0)
    q.process_due(deliver=lambda e: tentativas.append(1) or False, now=50)   # cedo
    assert len(tentativas) == 1
    q.process_due(deliver=lambda e: tentativas.append(1) or False, now=200)  # venceu
    assert len(tentativas) == 2


def test_fila_de_um_device_nao_afeta_outro(store):
    RetryQueue(store, "D4").enqueue(_event("E1", "D4"))
    RetryQueue(store, "D6").enqueue(_event("E2", "D6"))
    assert RetryQueue(store, "D4").pending_count() == 1
    assert RetryQueue(store, "D6").pending_count() == 1
    RetryQueue(store, "D4").process_due(deliver=lambda e: True)
    assert RetryQueue(store, "D4").pending_count() == 0
    assert RetryQueue(store, "D6").pending_count() == 1


def test_ingest_state_manager_isola_por_device(store):
    m = IngestStateManager(store)
    d4, d6 = m.get_or_create("D4"), m.get_or_create("D6")
    assert d4 is not d6
    assert m.get_or_create("D4") is d4


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))
