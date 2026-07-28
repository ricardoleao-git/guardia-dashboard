"""
GuardIA Connector — Safety code do P6S (PND-01).

Toda operação de *write* na biblioteca facial exige um safety code no campo
`Ownner`. A fórmula é conhecida e fechada (CLAUDE.md §4.4, P6S-09 §4):

    MD5(unique_code + SystemTime) → 8 primeiros dígitos hex → invertidos

O que **não** está resolvido é a entrada `unique_code`. A descrição do campo
na documentação diz "dono da biblioteca" (o `Ownner` do binding), mas o
exemplo Java oficial simula com o **serial do device**. P6S-09 §4 acrescenta
duas hipóteses de reserva para o caso de nenhuma das duas passar.

Este módulo existe para que a incógnita tenha **um ponto único de troca**.
Nada aqui adivinha: as 4 hipóteses ficam atrás de um enum, o teste de bancada
(`scripts/bancada/`) descobre qual retorna `statusCode 0`, e o valor vencedor
vira o default — em UMA linha, aqui.

> Regra dos dois connectors (CLAUDE.md §14.6): este módulo é função pura, sem
> I/O de device, e **não** importa nem altera `p6s_client.py`/`main.py`. Ele
> parametriza uma incógnita marcada, que é o que o §4.4 manda fazer — não
> reescreve o connector.
"""
import hashlib
from dataclasses import dataclass
from enum import Enum
from typing import Optional


class UniqueCodeSource(str, Enum):
    """As 4 hipóteses para a entrada `unique_code`. Ordem = ordem de teste."""

    # A — o `Ownner` gravado no binding (`PUT /FrontDeviceOwnnerInfo`).
    #     Sustentada pela descrição do campo: "dono da biblioteca".
    OWNNER_BINDING = "ownner_binding"

    # B — o serial do device (`GET /System/DeviceInfo`).
    #     Sustentada pelo exemplo Java oficial.
    DEVICE_SERIAL = "device_serial"

    # C e D — reservas de P6S-09 §4, para o caso de A e B falharem.
    DEVICE_DID = "device_did"
    DEVICE_MAC = "device_mac"


# 🔴 PND-01 — PONTO ÚNICO DE TROCA.
# Depois da bancada, trocar este valor para a hipótese que retornou
# statusCode 0 e registrar o desfecho em docs/spec/05_Roadmap-e-Fases.md §6.
# Enquanto a pendência estiver aberta, `None` obriga o chamador a escolher
# explicitamente — nenhum default silencioso decide a questão por engano.
RESOLVED_UNIQUE_CODE_SOURCE: Optional[UniqueCodeSource] = None


@dataclass
class DeviceIdentity:
    """Os quatro identificadores que alimentam as hipóteses."""

    ownner_binding: Optional[str] = None   # ex.: "GUARDIA-<id-do-cliente>"
    serial: Optional[str] = None
    did: Optional[str] = None
    mac: Optional[str] = None

    def value_for(self, source: UniqueCodeSource) -> str:
        mapping = {
            UniqueCodeSource.OWNNER_BINDING: self.ownner_binding,
            UniqueCodeSource.DEVICE_SERIAL: self.serial,
            UniqueCodeSource.DEVICE_DID: self.did,
            UniqueCodeSource.DEVICE_MAC: self.mac,
        }
        value = mapping[source]
        if not value:
            raise ValueError(
                f"Identidade do device não tem valor para a hipótese {source.value!r}. "
                "Colher com GET /System/DeviceInfo antes de gerar o safety code."
            )
        return value


def compute_safety_code(unique_code: str, system_time: str) -> str:
    """
    A fórmula, isolada e testável.

    MD5(unique_code + system_time), 8 primeiros hex, invertidos.

    `system_time` tem que ser exatamente a mesma string enviada no campo
    `<SystemTime>` do XML — se divergir, o device rejeita mesmo com a
    hipótese certa.
    """
    digest = hashlib.md5((unique_code + system_time).encode()).hexdigest()
    return digest[:8][::-1]


def safety_code_for(
    identity: DeviceIdentity,
    system_time: str,
    source: Optional[UniqueCodeSource] = None,
) -> str:
    """
    Safety code para uma operação de write.

    `source` explícito vence; sem ele, usa `RESOLVED_UNIQUE_CODE_SOURCE`.
    Com a PND-01 aberta e nenhum dos dois informado, levanta — em vez de
    escolher uma hipótese por conta própria (CLAUDE.md §4.4).
    """
    chosen = source or RESOLVED_UNIQUE_CODE_SOURCE
    if chosen is None:
        raise ValueError(
            "PND-01 em aberto: a entrada do safety code (`unique_code`) ainda não "
            "foi validada em bancada. Rode scripts/bancada/ para descobrir qual "
            "hipótese retorna statusCode 0, ou passe `source=` explicitamente."
        )
    return compute_safety_code(identity.value_for(chosen), system_time)


def all_candidates(identity: DeviceIdentity, system_time: str) -> dict:
    """
    Gera todas as hipóteses viáveis com a identidade disponível.

    É o que o script de bancada consome: testa uma a uma contra o device e
    registra qual passa. Hipóteses sem valor na identidade são omitidas em
    vez de gerar código inválido.
    """
    out = {}
    for source in UniqueCodeSource:
        try:
            out[source] = compute_safety_code(identity.value_for(source), system_time)
        except ValueError:
            continue
    return out
