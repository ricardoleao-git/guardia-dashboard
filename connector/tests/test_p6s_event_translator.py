"""
Testes unitários para o tradutor P6S → catálogo canônico.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import pytest

from p6s_event_translator import translate_push_body


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


def test_tipo_desconhecido_vira_unmapped_em_vez_de_ser_descartado():
    """
    CORE-01 §4 e CORE-02 §2: o evento chega ao core com type='unmapped' e gera
    pendência. Levantar exceção aqui perderia o evento — o oposto do contrato.
    """
    raw = {"event_id": "D4-004", "event_type": "camera_offline_evento_inventado"}
    event = translate_push_body(raw, source_channel="http", device_serial="D4")

    assert event.event_type == "unmapped"
    # O operador bruto é preservado para a pendência saber o que estender.
    assert event.attributes["unmapped_operator"] == "camera_offline_evento_inventado"
    # E continua sendo um evento válido — passa a validação do catálogo.
    event.validate()


def test_payload_sem_event_type_tambem_vira_unmapped():
    event = translate_push_body({"event_id": "D4-005"}, source_channel="http", device_serial="D4")
    assert event.event_type == "unmapped"


def test_fence_intrusion():
    raw = {
        "event_id": "D6-001",
        "event_type": "fence",
        "event_time": "2026-07-27T10:10:00+00:00",
    }
    event = translate_push_body(raw, source_channel="mqtt", device_serial="D6")
    assert event.event_type == "fence.intrusion"
    assert event.source_channel == "mqtt"


# ----------------------------------------- identidade estável (CacheEventEnable)
def test_event_id_do_device_vence_quando_existe():
    from p6s_event_translator import stable_event_id
    assert stable_event_id({"event_id": "D4-42", "event_type": "face"}, "D4") == "D4-42"


def test_sem_event_id_a_chave_e_hash_do_payload_nao_do_relogio():
    """
    O device reentrega por CacheEventEnable (CLAUDE.md §4.2). A mesma ocorrência
    tem que produzir a MESMA chave nas duas entregas, senão o dedupe não casa.
    Antes o id era `{serial}-{timestamp}`, que mudava a cada reentrega.
    """
    from p6s_event_translator import stable_event_id
    raw = {"event_type": "face", "face_list": "Stranger", "event_time": "2026-07-28T10:00:00Z"}
    assert stable_event_id(raw, "D4") == stable_event_id(dict(raw), "D4")


def test_hash_independe_da_ordem_das_chaves():
    """O device não garante ordem de serialização do JSON."""
    from p6s_event_translator import stable_event_id
    a = {"event_type": "face", "face_list": "Stranger", "z": 1}
    b = {"z": 1, "face_list": "Stranger", "event_type": "face"}
    assert stable_event_id(a, "D4") == stable_event_id(b, "D4")


def test_payloads_diferentes_dao_chaves_diferentes():
    from p6s_event_translator import stable_event_id
    base = {"event_type": "face", "event_time": "2026-07-28T10:00:00Z"}
    outro = {"event_type": "face", "event_time": "2026-07-28T10:00:01Z"}
    assert stable_event_id(base, "D4") != stable_event_id(outro, "D4")


def test_mesmo_payload_em_devices_diferentes_da_chaves_diferentes():
    from p6s_event_translator import stable_event_id
    raw = {"event_type": "face", "event_time": "2026-07-28T10:00:00Z"}
    assert stable_event_id(raw, "D4") != stable_event_id(raw, "D6")


def test_traduzir_duas_vezes_o_mesmo_payload_da_o_mesmo_event_id():
    """Integração: o tradutor inteiro, não só a função de hash."""
    raw = {"event_type": "face", "face_list": "Stranger", "event_time": "2026-07-28T10:00:00Z"}
    a = translate_push_body(dict(raw), source_channel="http", device_serial="D4")
    b = translate_push_body(dict(raw), source_channel="http", device_serial="D4")
    assert a.event_id == b.event_id


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))
