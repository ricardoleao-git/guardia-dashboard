"""
GuardIA Connector — Envio de eventos para Supabase.

Insere eventos na tabela camera_events via REST API.
Usa service_role key para bypass de RLS.
"""
import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

import requests
from loguru import logger


class SupabaseSink:
    """Envia eventos para o Supabase via REST API."""

    def __init__(self, supabase_url: str, service_role_key: str):
        self.supabase_url = supabase_url.rstrip("/")
        self.service_role_key = service_role_key
        self.rest_url = f"{self.supabase_url}/rest/v1"
        self.headers = {
            "Authorization": f"Bearer {service_role_key}",
            "apikey": service_role_key,
            "Content-Type": "application/json",
            "Prefer": "return=minimal",
        }

    def insert_event(self, event: Dict[str, Any]) -> bool:
        """Insere um único evento na tabela camera_events."""
        try:
            resp = requests.post(
                f"{self.rest_url}/camera_events",
                json=event,
                headers=self.headers,
                timeout=15,
            )
            if resp.status_code in (200, 201):
                logger.debug(f"Evento inserido: {event.get('event_id')}")
                return True
            elif resp.status_code == 409:
                # Conflito de PK — evento já existe, ignorar
                logger.debug(f"Evento já existe (409): {event.get('event_id')}")
                return True
            else:
                logger.warning(
                    f"Falha ao inserir evento {event.get('event_id')}: "
                    f"{resp.status_code} — {resp.text[:300]}"
                )
                return False
        except Exception as e:
            logger.error(f"Erro ao inserir evento: {e}")
            return False

    def insert_events_batch(self, events: List[Dict[str, Any]]) -> int:
        """
        Insere múltiplos eventos em lote.
        Retorna número de eventos inseridos com sucesso.
        """
        if not events:
            return 0
        
        try:
            resp = requests.post(
                f"{self.rest_url}/camera_events",
                json=events,
                headers={
                    **self.headers,
                    "Prefer": "return=minimal,resolution=ignore-duplicates",
                },
                timeout=30,
            )
            if resp.status_code in (200, 201):
                logger.info(f"Lote inserido: {len(events)} eventos")
                return len(events)
            else:
                logger.warning(
                    f"Falha no lote ({resp.status_code}): {resp.text[:300]}"
                )
                # Fallback: inserir um a um
                return sum(1 for e in events if self.insert_event(e))
        except Exception as e:
            logger.error(f"Erro no lote: {e}")
            return 0

    def update_connector_status(
        self,
        connector_id: str,
        online: bool,
        pending_events: int = 0,
        total_events: int = 0,
        cameras_status: Optional[Dict] = None,
    ) -> bool:
        """Atualiza status do connector na tabela connector_status."""
        payload = {
            "connector_id": connector_id,
            "online": online,
            "pending_events": pending_events,
            "total_events": total_events,
            "cameras_status": cameras_status or {},
            "last_sync": datetime.now(timezone.utc).isoformat(),
        }
        try:
            # Upsert (insert or update)
            resp = requests.post(
                f"{self.rest_url}/connector_status",
                json=payload,
                headers={
                    **self.headers,
                    "Prefer": "return=minimal,resolution=merge-duplicates",
                },
                timeout=10,
            )
            return resp.status_code in (200, 201)
        except Exception as e:
            logger.debug(f"connector_status update falhou (tabela pode não existir): {e}")
            return False

    def get_last_event_time(self, camera_serial: str) -> Optional[str]:
        """Busca o timestamp do último evento de uma câmera no banco."""
        try:
            resp = requests.get(
                f"{self.rest_url}/camera_events",
                params={
                    "camera_serial": f"eq.{camera_serial}",
                    "select": "event_time",
                    "order": "event_time.desc",
                    "limit": 1,
                },
                headers=self.headers,
                timeout=10,
            )
            if resp.status_code == 200:
                data = resp.json()
                if data:
                    return data[0]["event_time"]
        except Exception as e:
            logger.debug(f"get_last_event_time falhou para {camera_serial}: {e}")
        return None
