"""
Testes do safety code (PND-01).
"""
import hashlib
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

import pytest

import p6s_safety_code as sc
from p6s_safety_code import (
    DeviceIdentity,
    UniqueCodeSource,
    all_candidates,
    compute_safety_code,
    safety_code_for,
)


def test_formula_bate_com_o_exemplo_literal_do_p6s09():
    """P6S-09 §4.2: MD5(unique_code + system_time)[:8][::-1]."""
    uc, st = "GUARDIA-TESTE01", "2026-07-26T10:00:00"
    esperado = hashlib.md5((uc + st).encode()).hexdigest()[:8][::-1]
    assert compute_safety_code(uc, st) == esperado
    assert len(compute_safety_code(uc, st)) == 8


def test_system_time_diferente_muda_o_codigo():
    a = compute_safety_code("X", "2026-07-26T10:00:00")
    b = compute_safety_code("X", "2026-07-26T10:00:01")
    assert a != b


def test_all_candidates_omite_hipotese_sem_valor():
    ident = DeviceIdentity(ownner_binding="GUARDIA-01", serial="SN123")
    cands = all_candidates(ident, "2026-07-26T10:00:00")
    assert set(cands) == {UniqueCodeSource.OWNNER_BINDING, UniqueCodeSource.DEVICE_SERIAL}


def test_all_candidates_com_identidade_completa_da_quatro():
    ident = DeviceIdentity(ownner_binding="O", serial="S", did="D", mac="M")
    assert len(all_candidates(ident, "2026-07-26T10:00:00")) == 4


def test_pnd01_aberta_recusa_escolher_sozinho():
    """Com a pendência aberta e sem source explícito, tem que levantar."""
    assert sc.RESOLVED_UNIQUE_CODE_SOURCE is None, (
        "Se este assert cair, a PND-01 foi fechada — atualizar o teste com a hipótese vencedora."
    )
    ident = DeviceIdentity(ownner_binding="O", serial="S")
    with pytest.raises(ValueError, match="PND-01"):
        safety_code_for(ident, "2026-07-26T10:00:00")


def test_source_explicito_funciona_com_pendencia_aberta():
    ident = DeviceIdentity(ownner_binding="O", serial="S")
    got = safety_code_for(ident, "2026-07-26T10:00:00", source=UniqueCodeSource.DEVICE_SERIAL)
    assert got == compute_safety_code("S", "2026-07-26T10:00:00")


def test_hipotese_sem_valor_na_identidade_levanta():
    ident = DeviceIdentity(ownner_binding="O")  # sem serial
    with pytest.raises(ValueError, match="DeviceInfo"):
        safety_code_for(ident, "2026-07-26T10:00:00", source=UniqueCodeSource.DEVICE_SERIAL)


if __name__ == "__main__":
    sys.exit(pytest.main([__file__, "-q"]))
