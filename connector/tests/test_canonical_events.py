"""
Testes unitários para o catálogo canônico de eventos.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import pytest

from canonical_events import CanonicalEvent, Correlation, CanonicalEventError


def _base_event(**overrides):
    defaults = dict(
        event_id="D4-abc123",
        event_type="face.unknown",
        device_serial="D4",
        occurred_at="2026-07-27T10:30:00+00:00",
        received_at="2026-07-27T10:30:01+00:00",
        source_channel="http",
        correlation=Correlation(face_uuid=None, group_id2="turma-3b"),
    )
    defaults.update(overrides)
    return CanonicalEvent(**defaults)


def test_valid_event_passes():
    event = _base_event()
    event.validate()  # não deve levantar


def test_rejects_type_fora_do_catalogo():
    event = _base_event(event_type="recognize_image")
    with pytest.raises(CanonicalEventError):
        event.validate()


def test_rejects_vocabulario_de_fabricante_em_attributes():
    event = _base_event(attributes={"face_score": 95})
    with pytest.raises(CanonicalEventError):
        event.validate()


def test_to_core_payload_nao_inclui_raw_debug():
    event = _base_event(raw_debug={"face_list": "Stranger"})
    payload = event.to_core_payload()
    assert "raw_debug" not in payload
    assert payload["face_uuid"] is None
    assert payload["group_id2"] == "turma-3b"


if __name__ == "__main__":
    test_valid_event_passes()
    test_rejects_type_fora_do_catalogo()
    test_rejects_vocabulario_de_fabricante_em_attributes()
    test_to_core_payload_nao_inclui_raw_debug()
    print("Todos os testes passaram!")
