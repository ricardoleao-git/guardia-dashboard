"""
Testes unitários para o tradutor P6S → catálogo canônico.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import pytest

from p6s_event_translator import translate_push_body, UnrecognizedRawEventType


def test_face_unknown_sem_faceuuid():
    raw = {
        "event_id": "D4-001",
        "event_type": "face",
        "face_list": "Stranger",
        "event_time": "2026-07-27T10:00:00+00:00",
    }
    event = translate_push_body(raw, source_channel="http", device_serial="D4")
    assert event.event_type == "face.unknown"
    assert event.correlation.face_uuid is None


def test_face_recognized_com_faceuuid_e_groupid2():
    raw = {
        "event_id": "D4-002",
        "event_type": "face",
        "face_list": "WhiteList",
        "FaceUUID": "aluno-123",
        "GroupID2": "turma-3b",
        "face_score": 95,
        "event_time": "2026-07-27T10:05:00+00:00",
    }
    event = translate_push_body(raw, source_channel="http", device_serial="D4")
    assert event.event_type == "face.recognized"
    assert event.correlation.face_uuid == "aluno-123"
    assert event.correlation.group_id2 == "turma-3b"
    assert event.attributes["match_score"] == 95


def test_person_name_e_ignorado_nunca_vira_chave():
    raw = {
        "event_id": "D4-003",
        "event_type": "face",
        "face_list": "WhiteList",
        "FaceUUID": "aluno-123",
        "GroupID2": "turma-3b",
        "person_name": "João Silva",
        "event_time": "2026-07-27T10:06:00+00:00",
    }
    event = translate_push_body(raw, source_channel="http", device_serial="D4")
    assert "person_name" not in event.attributes
    payload = event.to_core_payload()
    assert "person_name" not in payload


def test_tipo_desconhecido_levanta_erro_em_vez_de_adivinhar():
    raw = {"event_id": "D4-004", "event_type": "camera_offline_evento_inventado"}
    with pytest.raises(UnrecognizedRawEventType):
        translate_push_body(raw, source_channel="http", device_serial="D4")


def test_fence_intrusion():
    raw = {
        "event_id": "D6-001",
        "event_type": "fence",
        "event_time": "2026-07-27T10:10:00+00:00",
    }
    event = translate_push_body(raw, source_channel="mqtt", device_serial="D6")
    assert event.event_type == "fence.intrusion"
    assert event.source_channel == "mqtt"


if __name__ == "__main__":
    test_face_unknown_sem_faceuuid()
    test_face_recognized_com_faceuuid_e_groupid2()
    test_person_name_e_ignorado_nunca_vira_chave()
    test_tipo_desconhecido_levanta_erro_em_vez_de_adivinhar()
    test_fence_intrusion()
    print("Todos os testes passaram!")
