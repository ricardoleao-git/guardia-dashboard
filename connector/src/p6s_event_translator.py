"""
GuardIA Connector — Tradutor P6S → catálogo canônico.

Fronteira dura (CLAUDE.md §6): vocabulário de fabricante não passa desta
camada. Tudo que sai daqui é CanonicalEvent — sem `face_list`, `face_score`,
`recognize_image`, `capture_image` nem `person_name`.

[LACUNA] importante: o formato exato do corpo de evento `[HTTP]`/`[MQTT]`
(CLAUDE.md §3.2/§3.3: "mesmo corpo, envelope diferente") não está na
documentação disponível aqui campo a campo. RAW_FIELD_* abaixo são a
melhor hipótese hoje — herdada dos nomes que já apareciam no
`camera_events` atual (`db/00_setup_complete.sql`), que por sua vez vieram
de inspeção de payload real em algum momento do protótipo. Precisam ser
confirmados contra um payload capturado na bancada (P6S-09) antes de
qualquer cliente real depender disso. `FaceUUID`/`GroupID2` são a exceção:
essas duas vêm direto do protocolo documentado (§3.5) e não são hipótese.

Evento sem correspondente no catálogo **não se descarta**. O `CORE-01` §4
define `type text not null -- 'unmapped' quando sem correspondente`, e o
`CORE-02` §2 exige que ele chegue ao core e **gere pendência**, em vez de
disparar regra. Levantar exceção aqui perderia o evento — o oposto do que o
contrato pede. O tradutor emite `unmapped` e preserva o operador bruto em
`attributes.unmapped_operator`, para que a pendência saiba o que estender.
"""
import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Dict

from loguru import logger

from canonical_events import CanonicalEvent, Correlation, CanonicalEventError

# Vendor face-list markers → o device manda o hint da lista batida.
# "Stranger"/None/ausente => face.unknown; qualquer lista nomeada
# associada a um FaceUUID conhecido => face.recognized.
_UNKNOWN_FACE_LIST_MARKERS = {None, "", "Stranger", "BlackList"}

_RAW_EVENT_FAMILY_TO_CANONICAL = {
    "fence": "fence.intrusion",
    "line": "line.crossed",
    "flow": "flow.count",
    "fall": "person.fall",
    "smoke": "smoke.detected",
    "door": "door.held_open",
    "post": "post.abandoned",
}


def _to_iso8601(raw_time: Any) -> str:
    if isinstance(raw_time, str) and raw_time:
        return raw_time
    return datetime.now(timezone.utc).isoformat()


def stable_event_id(raw: Dict[str, Any], device_serial: str) -> str:
    """
    Identidade do evento, estável entre retransmissões.

    O device usa `CacheEventEnable` para reentregar o que se perdeu numa queda
    de rede ou energia (`CLAUDE.md` §4.2). Para o dedupe funcionar, a mesma
    ocorrência tem que produzir a mesma chave nas duas entregas.

    Quando o device manda um id, ele vence. Quando **não** manda, a chave é o
    hash do payload — e não o relógio. Gerar `{serial}-{timestamp}` como antes
    fazia cada reentrega parecer um evento novo, o que anulava o dedupe
    justamente no cenário que o §4.2 descreve.
    """
    device_id = raw.get("event_id") or raw.get("EventID") or raw.get("device_event_id")
    if device_id:
        return str(device_id)

    # Hash do payload inteiro, com chaves ordenadas para ser determinístico
    # independentemente da ordem em que o device serializou o JSON.
    canonical = json.dumps(raw, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    digest = hashlib.sha256(f"{device_serial}|{canonical}".encode()).hexdigest()[:20]
    return f"{device_serial}-sha{digest}"


def _face_or_plate_subtype(raw: Dict[str, Any], family: str) -> str:
    list_marker = raw.get("face_list") if family == "face" else raw.get("plate_list")
    has_correlation_id = bool(raw.get("FaceUUID"))
    if list_marker in _UNKNOWN_FACE_LIST_MARKERS or not has_correlation_id:
        return f"{family}.unknown"
    return f"{family}.recognized"


def translate_push_body(
    raw: Dict[str, Any],
    source_channel: str,
    device_serial: str,
) -> CanonicalEvent:
    """
    Traduz um corpo de evento P6S (push HTTP ou MQTT — mesmo shape) para
    CanonicalEvent.

    Nunca descarta: operador bruto sem correspondente no catálogo vira
    `unmapped`, com o valor original preservado em
    `attributes.unmapped_operator` (CORE-01 §4, CORE-02 §2).
    """
    if raw.get("person_name"):
        logger.warning(
            "[translator] payload trouxe person_name — CAMPO IGNORADO. "
            "Correlação é sempre por FaceUUID/GroupID2 (CLAUDE.md §5), nunca por nome."
        )

    raw_family = str(raw.get("event_type", "")).lower()
    attributes: Dict[str, Any] = {}

    if raw_family in ("face", "plate"):
        canonical_type = _face_or_plate_subtype(raw, raw_family)
    elif raw_family in _RAW_EVENT_FAMILY_TO_CANONICAL:
        canonical_type = _RAW_EVENT_FAMILY_TO_CANONICAL[raw_family]
    else:
        # Não deduzir por analogia (CLAUDE.md §10.1) e não perder o evento
        # (CORE-02 §2). O core recebe, não dispara regra, e abre pendência.
        canonical_type = "unmapped"
        attributes["unmapped_operator"] = raw.get("event_type")
        logger.warning(
            f"[translator] operador sem correspondente no catálogo v0: "
            f"{raw.get('event_type')!r} → emitido como 'unmapped'. "
            "Gera pendência no core; não dispara regra."
        )

    if raw.get("face_score") is not None:
        attributes["match_score"] = raw["face_score"]
    if isinstance(raw.get("attributes"), dict):
        attributes.update(raw["attributes"])

    snapshot_ref = raw.get("capture_image") or raw.get("recognize_image")

    event = CanonicalEvent(
        event_id=stable_event_id(raw, device_serial),
        event_type=canonical_type,
        device_serial=device_serial,
        occurred_at=_to_iso8601(raw.get("event_time")),
        received_at=datetime.now(timezone.utc).isoformat(),
        source_channel=source_channel,
        correlation=Correlation(
            face_uuid=raw.get("FaceUUID"),
            group_id2=raw.get("GroupID2") or raw.get("FaceGroupID"),
        ),
        attributes=attributes,
        snapshot_ref=snapshot_ref,
        raw_debug=raw,
    )
    event.validate()
    return event
