"""
GuardIA Connector — Alertas via WhatsApp.

Envia notificações críticas (stranger, blacklist, acesso negado) via
WhatsApp Business API (Meta Cloud API) para o operador de plantão.

Requer configuração no config.yaml:
  whatsapp:
    enabled: true
    phone_number_id: "123456789"       # Meta Cloud API
    access_token: "EAAB..."            # Meta Cloud API token
    recipient_phone: "5588999999999"   # Número do operador (com DDI)
    alert_types: ["stranger", "blacklist", "access_denied", "alarm"]
"""
import json
import requests
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List
from loguru import logger


class WhatsAppAlerter:
    """Envia alertas críticos via WhatsApp Business API."""

    # Mapeamento de tipos de alerta
    ALERT_RULES = {
        "stranger": {
            "face_list_values": ["Stranger", "stranger"],
            "condition": lambda event: (
                event.get("face_list", "").lower() == "stranger" or
                (not event.get("person_name") and not event.get("face_score"))
            ),
            "priority": "CRÍTICO",
            "emoji": "🚨",
        },
        "blacklist": {
            "face_list_values": ["BlackList", "blacklist"],
            "condition": lambda event: event.get("face_list", "").lower() == "blacklist",
            "priority": "CRÍTICO",
            "emoji": "⚠️",
        },
        "access_denied": {
            "condition": lambda event: (
                event.get("event_type") == "access" and
                event.get("attributes", {}).get("access") == "denied"
            ),
            "priority": "CRÍTICO",
            "emoji": "🚫",
        },
        "alarm": {
            "condition": lambda event: event.get("event_type") == "alarm",
            "priority": "CRÍTICO",
            "emoji": "🔔",
        },
    }

    def __init__(
        self,
        phone_number_id: str,
        access_token: str,
        recipient_phone: str,
        alert_types: List[str] = None,
        enabled: bool = True,
    ):
        self.phone_number_id = phone_number_id
        self.access_token = access_token
        self.recipient_phone = recipient_phone
        self.alert_types = alert_types or ["stranger", "blacklist", "access_denied", "alarm"]
        self.enabled = enabled
        self.api_url = f"https://graph.facebook.com/v21.0/{phone_number_id}/messages"

        # Rate limiting: máximo 1 alerta por minuto por tipo
        self._last_alert_time: Dict[str, float] = {}
        self._rate_limit_seconds = 60

    def _should_alert(self, event: Dict[str, Any]) -> Optional[str]:
        """Verifica se o evento deve disparar um alerta. Retorna o tipo ou None."""
        if not self.enabled:
            return None

        for alert_type in self.alert_types:
            rule = self.ALERT_RULES.get(alert_type)
            if rule and rule["condition"](event):
                # Rate limiting
                now = datetime.now(timezone.utc).timestamp()
                last = self._last_alert_time.get(alert_type, 0)
                if now - last < self._rate_limit_seconds:
                    logger.debug(f"WhatsApp: rate limit para '{alert_type}', pulando")
                    return None
                self._last_alert_time[alert_type] = now
                return alert_type
        return None

    def _format_message(self, event: Dict[str, Any], alert_type: str) -> str:
        """Formata a mensagem de alerta para WhatsApp."""
        rule = self.ALERT_RULES.get(alert_type, {})
        priority = rule.get("priority", "ALERTA")
        emoji = rule.get("emoji", "⚠️")

        camera = event.get("camera_serial", "N/A")
        camera_name = event.get("camera_name", "")
        person = event.get("person_name", "Não identificado")
        score = event.get("face_score", "N/A")
        face_list = event.get("face_list", "")
        event_time = event.get("event_time", datetime.now(timezone.utc).isoformat())

        # Formatar horário
        try:
            dt = datetime.fromisoformat(event_time.replace("Z", "+00:00"))
            time_str = dt.strftime("%d/%m/%Y às %H:%M:%S")
        except Exception:
            time_str = event_time

        lines = [
            f"{emoji} *GUARDIA — ALERTA {priority}*",
            "",
            f"*Tipo:* {alert_type.upper()}",
            f"*Câmera:* {camera}" + (f" ({camera_name})" if camera_name else ""),
            f"*Pessoa:* {person}",
            f"*Lista:* {face_list or 'N/A'}",
            f"*Score:* {score}%",
            f"*Horário:* {time_str}",
            "",
            f"_Acesse o dashboard: guardia-vms.zenitetech.com_",
        ]

        # Adicionar URL da imagem se disponível
        recognize_img = event.get("recognize_image")
        if recognize_img:
            lines.append(f"\n📸 Foto: {recognize_img}")

        return "\n".join(lines)

    def send_alert(self, event: Dict[str, Any]) -> bool:
        """
        Verifica se o evento é crítico e envia alerta via WhatsApp.
        Retorna True se o alerta foi enviado.
        """
        alert_type = self._should_alert(event)
        if not alert_type:
            return False

        message = self._format_message(event, alert_type)

        try:
            payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": self.recipient_phone,
                "type": "text",
                "text": {
                    "preview_url": True,
                    "body": message,
                },
            }

            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json",
            }

            resp = requests.post(
                self.api_url,
                json=payload,
                headers=headers,
                timeout=15,
            )

            if resp.status_code in (200, 201):
                logger.info(f"WhatsApp: alerta '{alert_type}' enviado para {self.recipient_phone}")
                return True
            else:
                logger.warning(
                    f"WhatsApp: falha ao enviar ({resp.status_code}): {resp.text[:300]}"
                )
                return False

        except Exception as e:
            logger.error(f"WhatsApp: erro ao enviar alerta: {e}")
            return False

    def send_image_alert(self, event: Dict[str, Any], image_url: str) -> bool:
        """Envia alerta com imagem anexada via WhatsApp."""
        alert_type = self._should_alert(event)
        if not alert_type:
            return False

        message = self._format_message(event, alert_type)

        try:
            # Primeiro envia a imagem
            img_payload = {
                "messaging_product": "whatsapp",
                "recipient_type": "individual",
                "to": self.recipient_phone,
                "type": "image",
                "image": {
                    "link": image_url,
                    "caption": message,
                },
            }

            headers = {
                "Authorization": f"Bearer {self.access_token}",
                "Content-Type": "application/json",
            }

            resp = requests.post(
                self.api_url,
                json=img_payload,
                headers=headers,
                timeout=20,
            )

            if resp.status_code in (200, 201):
                logger.info(f"WhatsApp: alerta com imagem '{alert_type}' enviado")
                return True
            else:
                # Fallback: envia apenas texto
                logger.warning(f"WhatsApp: imagem falhou, enviando texto: {resp.text[:200]}")
                return self.send_alert(event)

        except Exception as e:
            logger.error(f"WhatsApp: erro ao enviar imagem: {e}")
            return self.send_alert(event)
