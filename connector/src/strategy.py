"""
GuardIA Connector — Strategy do Heartbeat-Ack por vertical.

CLAUDE.md §3.2: "Heartbeat-Ack é obrigatório. O Ack carrega a strategy
(flags is...Enable) que liga/desliga cada tipo de evento e o intervalo.
Sem Ack, o device para de enviar eventos."

Os nomes exatos das flags `is...Enable` por tipo de evento não estão
documentados no material disponível aqui — [LACUNA]. O mapeamento abaixo
(CANONICAL_TO_STRATEGY_FLAG) é o ponto único para preencher esses nomes
assim que confirmados na bancada; até lá, o valor é um placeholder óbvio
para não ser confundido com dado real.

O que já é firme (CLAUDE.md §6, §7): quais eventos cada vertical liga,
e que cerca virtual + contagem em pátio ficam bloqueados no perfil
escolar até parecer jurídico — isso não é uma hipótese, é regra de produto.
"""
from typing import Dict, Optional

# [LACUNA] — confirmar nome exato de cada flag na bancada (heartbeat real).
CANONICAL_TO_STRATEGY_FLAG = {
    "face.recognized": "isFaceRecognitionEnable",
    "face.unknown": "isFaceRecognitionEnable",
    "fence.intrusion": "isFenceDetectEnable",
    "line.crossed": "isLineCrossingEnable",
    "flow.count": "isFlowCountEnable",
    "person.fall": "isFallDetectEnable",
    "smoke.detected": "isSmokeDetectEnable",
    "door.held_open": "isDoorHeldOpenEnable",
    "post.abandoned": "isPostAbandonedEnable",
    "plate.recognized": "isLPREnable",
    "plate.unknown": "isLPREnable",
}

# CLAUDE.md §6 — perfis por vertical. Cerca e contagem bloqueadas no
# escolar até parecer jurídico (§7) — não é um default, é uma trava.
VERTICAL_EVENT_PROFILES: Dict[str, Dict[str, bool]] = {
    "escolar": {
        "face.unknown": True,
        "face.recognized": True,
        "person.fall": True,
        "smoke.detected": True,
        "fence.intrusion": False,  # bloqueado até parecer jurídico
        "flow.count": False,  # bloqueado até parecer jurídico
        "line.crossed": False,
        "door.held_open": False,
        "post.abandoned": False,
        "plate.recognized": False,
        "plate.unknown": False,
    },
    "condominio": {
        "face.unknown": True,
        "face.recognized": True,
        "plate.recognized": True,
        "plate.unknown": True,
        "door.held_open": True,
        "post.abandoned": False,
        "fence.intrusion": True,
        "line.crossed": True,
        "flow.count": False,
        "person.fall": False,
        "smoke.detected": False,
    },
}


class UnknownVerticalError(ValueError):
    pass


def build_ack_strategy(
    vertical: str,
    heartbeat_interval_seconds: int = 60,
    overrides: Optional[Dict[str, bool]] = None,
) -> Dict[str, object]:
    """
    Monta o corpo do Heartbeat-Ack para um device de uma vertical.

    `overrides` permite ligar/desligar evento específico por device
    (ex.: device sem sensor de fumaça), sem violar o perfil da vertical.
    """
    profile = VERTICAL_EVENT_PROFILES.get(vertical)
    if profile is None:
        raise UnknownVerticalError(
            f"Vertical desconhecida: {vertical!r}. Verticais válidas: "
            f"{sorted(VERTICAL_EVENT_PROFILES)}"
        )

    enabled = dict(profile)
    if overrides:
        for event_type, value in overrides.items():
            if event_type not in enabled:
                raise ValueError(f"Tipo de evento fora do catálogo v0: {event_type!r}")
            enabled[event_type] = value

    strategy = {
        CANONICAL_TO_STRATEGY_FLAG[event_type]: is_enabled
        for event_type, is_enabled in enabled.items()
    }
    strategy["heartbeatInterval"] = heartbeat_interval_seconds
    strategy["cacheEventEnable"] = True  # CLAUDE.md §4.2 — retransmite após queda
    return strategy
