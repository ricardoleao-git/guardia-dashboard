"""
GuardIA Connector — Estado de ingestão por device.

Sem isto o connector não tem buffer, ACK, dedupe nem retry (defeito
conhecido #3 do CLAUDE.md §9). Cada device tem seu próprio dedupe cache
e sua própria fila de retry — um device lento ou fora do ar não pode
travar os outros.
"""
import time
from collections import OrderedDict
from dataclasses import dataclass, field
from typing import Callable, Dict, Optional

from loguru import logger

from canonical_events import CanonicalEvent


class DedupeCache:
    """Cache de event_id vistos, com expurgo por tamanho (LRU) e por idade."""

    def __init__(self, max_size: int = 5000, ttl_seconds: int = 3600):
        self.max_size = max_size
        self.ttl_seconds = ttl_seconds
        self._seen: "OrderedDict[str, float]" = OrderedDict()

    def _evict_expired(self, now: float) -> None:
        while self._seen:
            oldest_id, seen_at = next(iter(self._seen.items()))
            if now - seen_at > self.ttl_seconds:
                self._seen.popitem(last=False)
            else:
                break

    def is_duplicate(self, event_id: str, now: Optional[float] = None) -> bool:
        now = now if now is not None else time.time()
        self._evict_expired(now)
        if event_id in self._seen:
            self._seen.move_to_end(event_id)
            return True
        self._seen[event_id] = now
        while len(self._seen) > self.max_size:
            self._seen.popitem(last=False)
        return False


@dataclass
class RetryItem:
    event: CanonicalEvent
    attempts: int = 0
    next_attempt_at: float = 0.0  # elegível imediatamente após enqueue()


class RetryQueue:
    """
    Fila de entrega para o GuardIA Core com retry exponencial.

    Backoff: base_seconds * 2^attempts, limitado a max_backoff_seconds.
    Depois de max_attempts, o evento vai para dead-letter (log) — não é
    descartado silenciosamente (CLAUDE.md §14.7.3: nada de perda muda).
    """

    def __init__(
        self,
        base_seconds: float = 2.0,
        max_backoff_seconds: float = 300.0,
        max_attempts: int = 8,
    ):
        self.base_seconds = base_seconds
        self.max_backoff_seconds = max_backoff_seconds
        self.max_attempts = max_attempts
        self._items: Dict[str, RetryItem] = {}
        self.dead_letters: Dict[str, RetryItem] = {}

    def enqueue(self, event: CanonicalEvent) -> None:
        self._items[event.event_id] = RetryItem(event=event)

    def _backoff_for(self, attempts: int) -> float:
        return min(self.base_seconds * (2 ** attempts), self.max_backoff_seconds)

    def process_due(
        self,
        deliver: Callable[[CanonicalEvent], bool],
        now: Optional[float] = None,
    ) -> int:
        """Tenta entregar itens vencidos. Retorna quantos foram entregues."""
        now = now if now is not None else time.time()
        delivered = 0
        for event_id in list(self._items.keys()):
            item = self._items[event_id]
            if item.next_attempt_at > now:
                continue
            ok = False
            try:
                ok = deliver(item.event)
            except Exception as e:
                logger.error(f"Falha ao entregar evento {event_id}: {e}")
            if ok:
                del self._items[event_id]
                delivered += 1
                continue
            item.attempts += 1
            if item.attempts >= self.max_attempts:
                logger.error(
                    f"Evento {event_id} esgotou {self.max_attempts} tentativas — "
                    "movido para dead-letter."
                )
                self.dead_letters[event_id] = item
                del self._items[event_id]
            else:
                item.next_attempt_at = now + self._backoff_for(item.attempts)
        return delivered

    def pending_count(self) -> int:
        return len(self._items)


class DeviceState:
    """Estado isolado de um device: dedupe, fila de retry, último Ack enviado."""

    def __init__(self, device_serial: str):
        self.device_serial = device_serial
        self.dedupe = DedupeCache()
        self.retry_queue = RetryQueue()
        self.last_heartbeat_at: Optional[float] = None
        self.last_strategy_sent: Optional[dict] = None


class IngestStateManager:
    """Registro de DeviceState por device_serial — cria sob demanda."""

    def __init__(self):
        self._devices: Dict[str, DeviceState] = {}

    def get_or_create(self, device_serial: str) -> DeviceState:
        if device_serial not in self._devices:
            self._devices[device_serial] = DeviceState(device_serial)
        return self._devices[device_serial]

    def all_devices(self):
        return list(self._devices.values())
