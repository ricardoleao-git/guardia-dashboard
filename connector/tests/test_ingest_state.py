"""
Testes unitários para dedupe e fila de retry por device.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from canonical_events import CanonicalEvent, Correlation
from ingest_state import DedupeCache, RetryQueue, IngestStateManager


def _event(event_id="E1"):
    return CanonicalEvent(
        event_id=event_id,
        event_type="face.unknown",
        device_serial="D4",
        occurred_at="2026-07-27T10:00:00+00:00",
        received_at="2026-07-27T10:00:01+00:00",
        source_channel="http",
        correlation=Correlation(),
    )


def test_dedupe_marca_segunda_ocorrencia_como_duplicata():
    cache = DedupeCache()
    assert cache.is_duplicate("E1") is False
    assert cache.is_duplicate("E1") is True


def test_dedupe_evicta_por_tamanho():
    cache = DedupeCache(max_size=2)
    cache.is_duplicate("A")
    cache.is_duplicate("B")
    cache.is_duplicate("C")  # evicta "A"
    assert cache.is_duplicate("A") is False  # reaparece como "novo"


def test_retry_queue_entrega_com_sucesso_remove_da_fila():
    queue = RetryQueue()
    queue.enqueue(_event("E1"))
    delivered = queue.process_due(deliver=lambda e: True)
    assert delivered == 1
    assert queue.pending_count() == 0


def test_retry_queue_backoff_ate_dead_letter():
    queue = RetryQueue(base_seconds=0, max_attempts=2)
    queue.enqueue(_event("E1"))
    # Ambas as tentativas falham — 2ª já esgota max_attempts.
    queue.process_due(deliver=lambda e: False, now=0)
    queue.process_due(deliver=lambda e: False, now=0)
    assert queue.pending_count() == 0
    assert "E1" in queue.dead_letters


def test_ingest_state_manager_isola_por_device():
    manager = IngestStateManager()
    d4 = manager.get_or_create("D4")
    d6 = manager.get_or_create("D6")
    assert d4 is not d6
    assert manager.get_or_create("D4") is d4


if __name__ == "__main__":
    test_dedupe_marca_segunda_ocorrencia_como_duplicata()
    test_dedupe_evicta_por_tamanho()
    test_retry_queue_entrega_com_sucesso_remove_da_fila()
    test_retry_queue_backoff_ate_dead_letter()
    test_ingest_state_manager_isola_por_device()
    print("Todos os testes passaram!")
