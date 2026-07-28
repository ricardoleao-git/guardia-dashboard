"""
Valida o JSON Schema do catálogo canônico (contracts/events/) e o que ele barra.

O teste que mais importa aqui é o de rejeição: se um evento com vocabulário
de fabricante passar, a fronteira do CLAUDE.md §6 não existe na prática.
"""
import json
import sys
from pathlib import Path

import pytest

jsonschema = pytest.importorskip("jsonschema")

SCHEMA_PATH = (
    Path(__file__).resolve().parents[2] / "contracts" / "events" / "canonical-event.v0.schema.json"
)


@pytest.fixture(scope="module")
def validator():
    schema = json.loads(SCHEMA_PATH.read_text())
    jsonschema.Draft202012Validator.check_schema(schema)
    return jsonschema.Draft202012Validator(schema)


def _evento(**over):
    base = {
        "schema_version": "0",
        "type": "face.unknown",
        "driver": "p6s",
        "source": "camera_http",
        "device_serial": "D4",
        "dedupe_key": "D4|evt-1|face_recognition",
        "occurred_at": "2026-07-28T10:00:00-03:00",
    }
    base.update(over)
    return base


def test_schema_e_valido(validator):
    assert validator is not None


def test_evento_minimo_passa(validator):
    validator.validate(_evento())


def test_os_11_tipos_ratificados_passam(validator):
    for t in [
        "face.recognized", "face.unknown", "fence.intrusion", "line.crossed",
        "flow.count", "person.fall", "smoke.detected", "door.held_open",
        "post.abandoned", "plate.unknown", "unmapped",
    ]:
        validator.validate(_evento(type=t))


def test_tipo_fora_do_catalogo_e_rejeitado(validator):
    with pytest.raises(jsonschema.ValidationError):
        validator.validate(_evento(type="face_recognition"))  # vocabulário P6S


def test_vocabulario_de_fabricante_em_attributes_e_rejeitado(validator):
    """A fronteira do §6 imposta por schema, não por convenção."""
    for chave in [
        "face_list", "face_score", "recognize_image",
        "capture_image", "person_name", "BlackList", "WhiteList",
    ]:
        with pytest.raises(jsonschema.ValidationError):
            validator.validate(_evento(attributes={chave: "x"}))


def test_attributes_legitimos_passam(validator):
    validator.validate(_evento(attributes={
        "age": 23, "gender": "male", "glasses": True, "mask": False, "quality": 70,
    }))


def test_correlacao_por_face_uuid_e_group_id2(validator):
    validator.validate(_evento(
        type="face.recognized",
        correlation={"face_uuid": "aluno-123", "group_id2": "turma-6A"},
        match_list="white",
        match_score=89,
    ))


def test_match_score_fora_de_faixa_e_rejeitado(validator):
    with pytest.raises(jsonschema.ValidationError):
        validator.validate(_evento(match_score=101))


def test_severity_so_aceita_tres_valores(validator):
    for s in ("critical", "warning", "info"):
        validator.validate(_evento(severity=s))
    with pytest.raises(jsonschema.ValidationError):
        validator.validate(_evento(severity="urgente"))  # a quarta cor do CORE-03 §2


def test_media_com_os_tres_papeis(validator):
    validator.validate(_evento(media=[
        {"role": "capture", "url": "https://x/1.jpg", "md5": "a", "expires_at": "2026-07-28T10:05:00Z"},
        {"role": "enrolled"},
        {"role": "background"},
    ]))


def test_media_com_papel_invalido_e_rejeitada(validator):
    with pytest.raises(jsonschema.ValidationError):
        validator.validate(_evento(media=[{"role": "thumbnail"}]))


def test_campo_desconhecido_no_topo_e_rejeitado(validator):
    """additionalProperties:false — impede o schema de virar saco de gatos."""
    with pytest.raises(jsonschema.ValidationError):
        validator.validate(_evento(org_id="deveria-vir-do-core"))


def test_tipos_pendentes_de_ratificacao_ainda_passam(validator):
    """Aceitos de propósito; a decisão está registrada no README da pasta."""
    validator.validate(_evento(type="plate.recognized"))
    validator.validate(_evento(type="vehicle.bike_in_elevator"))


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))
