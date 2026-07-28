"""
GuardIA Connector — Autenticação do push de eventos (P6SHTTP).

CLAUDE.md §3.2: "Auth do push: assinatura estilo OAuth 1.0a, user_secret
= serial do device." Não há, na documentação disponível hoje, os nomes
exatos dos parâmetros OAuth1 usados pelo device (query string? header
Authorization? HMAC-SHA1 ou PLAINTEXT?). [LACUNA] — não deduzir por
analogia com OAuth1 genérico sem confirmar na bancada.

Modo padrão é "log_only": aceita o push e loga os parâmetros recebidos,
para que o primeiro push real na bancada revele o formato exato. Depois
de confirmado, trocar para "hmac_sha1" (hipótese mais comum de OAuth1) e
registrar a decisão aqui — mesmo padrão usado para o safety code (PND-01):
não fixar por comentário solto, fixar com o resultado medido.
"""
import hashlib
import hmac
from typing import Any, Dict, Optional
from urllib.parse import quote

from loguru import logger


class PushAuthVerifier:
    def __init__(self, mode: str = "log_only"):
        if mode not in ("log_only", "hmac_sha1", "disabled"):
            raise ValueError(f"push_auth mode inválido: {mode!r}")
        self.mode = mode

    def verify(
        self,
        method: str,
        url: str,
        params: Dict[str, Any],
        device_secret: str,
    ) -> bool:
        if self.mode == "disabled":
            return True

        oauth_params = {k: v for k, v in params.items() if k.startswith("oauth_")}
        signature = oauth_params.get("oauth_signature")

        if self.mode == "log_only":
            logger.info(
                f"[push_auth] log_only — params OAuth recebidos: {oauth_params} "
                f"(device_secret não verificado; usar esta captura para fechar o LACUNA)"
            )
            return True

        # mode == "hmac_sha1": hipótese OAuth1.0a padrão (RFC 5849),
        # user_secret do device como token secret. NÃO VALIDADO em hardware.
        if not signature:
            logger.warning("[push_auth] hmac_sha1: oauth_signature ausente no push")
            return False

        base_params = {k: v for k, v in oauth_params.items() if k != "oauth_signature"}
        base_string = self._signature_base_string(method, url, base_params)
        expected = self._hmac_sha1(base_string, device_secret)
        ok = hmac.compare_digest(expected, signature)
        if not ok:
            logger.warning("[push_auth] hmac_sha1: assinatura não bateu (hipótese pode estar errada)")
        return ok

    @staticmethod
    def _signature_base_string(method: str, url: str, params: Dict[str, Any]) -> str:
        sorted_params = "&".join(
            f"{quote(str(k), safe='')}={quote(str(v), safe='')}"
            for k, v in sorted(params.items())
        )
        return "&".join(quote(p, safe="") for p in (method.upper(), url, sorted_params))

    @staticmethod
    def _hmac_sha1(base_string: str, secret: str) -> str:
        key = f"{quote(secret, safe='')}&".encode("utf-8")
        digest = hmac.new(key, base_string.encode("utf-8"), hashlib.sha1).digest()
        import base64

        return base64.b64encode(digest).decode("utf-8")
