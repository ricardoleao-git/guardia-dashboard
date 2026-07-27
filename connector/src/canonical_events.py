"""
GuardIA Connector — Catálogo canônico de eventos (v0).

Vocabulário de fabricante nunca passa daqui para frente (CLAUDE.md §6).
Todo evento que sai do driver já está neste formato — sem `face_list`,
`face_score`, `recognize_image`, `capture_image`, `BlackList`/`WhiteList`
nem `person_name`.
"""
from dataclasses import dataclass, field
from typing import Any, Dict, Optional

# Tipos v0 (CLAUDE.md §6). Família plate.* tem só 2 membros confirmados
# aqui — [LACUNA] restante da enumeração completa de LPR.
CANONICAL_EVENT_TYPES = {
    "face.recognized",
    "face.unknown",
    "fence.intrusion",
    "line.crossed",
    "flow.count",
    "person.fall",
    "smoke.detected",
    "door.held_open",
    "post.abandoned",
    "plate.recognized",
    "plate.unknown",
}

# Chaves de vocabulário P6S que não podem aparecer em `attributes` nem em
# `correlation` de um CanonicalEvent (CLAUDE.md §5, §6, §9 item 4/5).
BANNED_VENDOR_KEYS = {
    "face_list",
    "face_score",
    "recognize_image",
    "capture_image",
    "person_name",
    "BlackList",
    "WhiteList",
}


class CanonicalEventError(ValueError):
    pass


@dataclass
class Correlation:
    """Chaves de correlação — nunca nome de pessoa (CLAUDE.md §5)."""

    face_uuid: Optional[str] = None
    group_id2: Optional[str] = None


@dataclass
class CanonicalEvent:
    event_id: str
    event_type: str
    device_serial: str
    occurred_at: str
    received_at: str
    source_channel: str  # "http" | "mqtt"
    correlation: Correlation = field(default_factory=Correlation)
    attributes: Dict[str, Any] = field(default_factory=dict)
    snapshot_ref: Optional[str] = None
    # Preenchido só para depuração do driver — NUNCA sai em to_core_payload().
    raw_debug: Optional[Dict[str, Any]] = None

    def validate(self) -> None:
        if self.event_type not in CANONICAL_EVENT_TYPES:
            raise CanonicalEventError(
                f"Tipo de evento fora do catálogo canônico v0: {self.event_type!r}. "
                "Endpoint/vocabulário inventado é bug — não deduzir por analogia (CLAUDE.md §10.1)."
            )
        leaked = BANNED_VENDOR_KEYS & set(self.attributes.keys())
        if leaked:
            raise CanonicalEventError(
                f"Vocabulário de fabricante vazou para attributes: {leaked}"
            )
        if self.source_channel not in ("http", "mqtt"):
            raise CanonicalEventError(f"source_channel inválido: {self.source_channel!r}")

    def to_core_payload(self) -> Dict[str, Any]:
        """Payload que o connector envia ao GuardIA Core — sem raw_debug."""
        self.validate()
        return {
            "event_id": self.event_id,
            "event_type": self.event_type,
            "device_serial": self.device_serial,
            "occurred_at": self.occurred_at,
            "received_at": self.received_at,
            "source_channel": self.source_channel,
            "face_uuid": self.correlation.face_uuid,
            "group_id2": self.correlation.group_id2,
            "attributes": self.attributes,
            "snapshot_ref": self.snapshot_ref,
        }
