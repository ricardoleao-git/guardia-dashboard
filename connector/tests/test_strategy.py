"""
Testes unitários para o Heartbeat-Ack strategy por vertical.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import pytest

from strategy import build_ack_strategy, UnknownVerticalError


def test_escolar_bloqueia_cerca_e_contagem():
    strategy = build_ack_strategy("escolar")
    assert strategy["isFenceDetectEnable"] is False
    assert strategy["isFlowCountEnable"] is False
    assert strategy["isFaceRecognitionEnable"] is True


def test_condominio_liga_lpr():
    strategy = build_ack_strategy("condominio")
    assert strategy["isLPREnable"] is True


def test_vertical_desconhecida_levanta_erro():
    with pytest.raises(UnknownVerticalError):
        build_ack_strategy("industrial")


def test_override_nao_liga_cerca_fora_do_perfil_por_engano():
    # Override existe para desligar evento específico por device, não
    # para religar o que a vertical bloqueia por regra de produto.
    strategy = build_ack_strategy("escolar", overrides={"smoke.detected": False})
    assert strategy["isSmokeDetectEnable"] is False
    assert strategy["isFenceDetectEnable"] is False  # segue bloqueado


def test_strategy_inclui_heartbeat_interval_e_cache_event():
    strategy = build_ack_strategy("condominio", heartbeat_interval_seconds=45)
    assert strategy["heartbeatInterval"] == 45
    assert strategy["cacheEventEnable"] is True


if __name__ == "__main__":
    test_escolar_bloqueia_cerca_e_contagem()
    test_condominio_liga_lpr()
    try:
        test_vertical_desconhecida_levanta_erro()
    except AssertionError:
        raise
    test_override_nao_liga_cerca_fora_do_perfil_por_engano()
    test_strategy_inclui_heartbeat_interval_e_cache_event()
    print("Todos os testes passaram!")
