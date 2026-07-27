"""
GuardIA Connector — Sink para o GuardIA Core (plugável).

Hoje só existe LoggingSink. A escrita real depende de duas coisas que
ainda não estão decididas (CLAUDE.md §14.3):

  1. PND-16 — nome da coluna de tenancy — bloqueia qualquer CREATE TABLE
     e, por extensão, o schema que este sink escreveria.
  2. Decisão de arquitetura pendente: `camera_events` hoje exige
     `service_role` no insert (`WITH CHECK (auth.role() = 'service_role')`),
     e o connector fala com anon key — quebra se ligado direto. Escolher
     entre dar service_role ao connector ou passar por um endpoint de
     ingestão HTTPS dedicado (§3 do CLAUDE.md, "a provisionar").

Não escrever um SupabaseCoreSink aqui seria repetir o erro do protótipo
atual (grava vocabulário de fabricante numa tabela sem tenancy). Melhor
manter a interface pronta e o sink real fora, até as duas decisões acima
saírem.
"""
from typing import Protocol

from loguru import logger

from canonical_events import CanonicalEvent


class CoreSink(Protocol):
    def deliver(self, event: CanonicalEvent) -> bool:
        ...


class LoggingSink:
    """Sink default: só loga o payload canônico. Sem gravação real."""

    def deliver(self, event: CanonicalEvent) -> bool:
        payload = event.to_core_payload()
        logger.info(f"[core_sink:log_only] {payload}")
        return True
