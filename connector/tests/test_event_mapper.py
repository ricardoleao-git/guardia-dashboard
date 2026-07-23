"""
Testes unitários para o EventMapper.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from event_mapper import EventMapper


def test_process_basic_event():
    """Testa mapeamento básico sem upload de imagens."""
    mapper = EventMapper(uploader=None, connector_id="test-01", org_id="test")
    
    raw = {
        "event_id": "D2-abc123",
        "camera_serial": "D2",
        "camera_name": "D2 · Corredor",
        "event_type": "face",
        "face_list": "WhiteList",
        "person_name": "João Silva",
        "face_score": 95,
        "capture_image": None,
        "recognize_image": None,
        "event_time": "2025-07-23T10:30:00+00:00",
        "attributes": {"gender": "M", "age": "30-40"},
    }
    
    result = mapper.process(raw)
    
    assert result["event_id"] == "D2-abc123"
    assert result["camera_serial"] == "D2"
    assert result["face_score"] == 95
    assert result["attributes"]["gender"] == "M"
    # Campos None devem ser removidos
    assert "capture_image" not in result
    assert "recognize_image" not in result


def test_process_strips_none_fields():
    """Campos None não devem aparecer no payload final."""
    mapper = EventMapper(uploader=None)
    raw = {
        "event_id": "test-001",
        "camera_serial": "D3",
        "event_type": "face",
        "face_list": "Stranger",
        "person_name": None,
        "face_score": 0,
        "event_time": "2025-07-23T10:30:00+00:00",
        "attributes": {},
    }
    result = mapper.process(raw)
    assert "person_name" not in result


if __name__ == "__main__":
    test_process_basic_event()
    test_process_strips_none_fields()
    print("Todos os testes passaram!")

