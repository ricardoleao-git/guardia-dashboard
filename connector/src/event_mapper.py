"""
GuardIA Connector — Mapeamento de eventos P6S para schema Supabase.

Processa eventos brutos das câmeras, faz upload de imagens e
retorna o payload pronto para inserção no Supabase.
"""
from typing import Dict, Any, Optional
from loguru import logger

from image_uploader import ImageUploader


class EventMapper:
    """Mapeia e enriquece eventos antes de enviar ao Supabase."""

    def __init__(
        self,
        uploader: Optional[ImageUploader] = None,
        connector_id: str = "connector-01",
        org_id: str = "default",
    ):
        self.uploader = uploader
        self.connector_id = connector_id
        self.org_id = org_id

    def process(self, raw_event: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processa um evento bruto:
        1. Faz upload das imagens (se habilitado)
        2. Substitui base64 por URLs públicas
        3. Retorna payload pronto para Supabase
        """
        event = dict(raw_event)
        event_id = event.get("event_id", "unknown")
        camera_serial = event.get("camera_serial", "unknown")

        # Upload de imagem de captura (rosto detectado)
        if self.uploader and event.get("capture_image"):
            capture_b64 = event.pop("capture_image")
            if capture_b64 and len(capture_b64) > 100:
                path = self.uploader.make_path(camera_serial, event_id, "capture")
                url = self.uploader.upload_base64(capture_b64, path)
                event["capture_image"] = url
            else:
                event["capture_image"] = None

        # Upload de imagem de cadastro (foto do banco)
        if self.uploader and event.get("recognize_image"):
            recognize_b64 = event.pop("recognize_image")
            if recognize_b64 and len(recognize_b64) > 100:
                path = self.uploader.make_path(camera_serial, event_id, "recognize")
                url = self.uploader.upload_base64(recognize_b64, path)
                event["recognize_image"] = url
            else:
                event["recognize_image"] = None

        # Garantir que attributes é um dict válido
        if not isinstance(event.get("attributes"), dict):
            event["attributes"] = {}

        # Remover campos None para não sobrescrever defaults do banco
        event = {k: v for k, v in event.items() if v is not None}

        return event
