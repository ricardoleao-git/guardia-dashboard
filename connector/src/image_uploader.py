"""
GuardIA Connector — Upload de imagens para Supabase Storage.

Faz upload de imagens base64 ou bytes para o bucket 'event-images'.
Retorna a URL pública da imagem.
"""
import base64
import hashlib
import io
from typing import Optional

import requests
from loguru import logger


class ImageUploader:
    """Gerencia upload de imagens para Supabase Storage."""

    def __init__(self, supabase_url: str, service_role_key: str, bucket: str = "event-images"):
        self.supabase_url = supabase_url.rstrip("/")
        self.service_role_key = service_role_key
        self.bucket = bucket
        self.storage_url = f"{self.supabase_url}/storage/v1/object/{bucket}"
        self.headers = {
            "Authorization": f"Bearer {service_role_key}",
            "apikey": service_role_key,
        }

    def upload_base64(
        self,
        base64_data: str,
        path: str,
        content_type: str = "image/jpeg",
    ) -> Optional[str]:
        """
        Faz upload de imagem em base64 para o Storage.
        Retorna URL pública ou None em caso de erro.
        """
        try:
            # Remover prefixo data:image/... se presente
            if "," in base64_data:
                base64_data = base64_data.split(",", 1)[1]
            
            image_bytes = base64.b64decode(base64_data)
            return self.upload_bytes(image_bytes, path, content_type)
        except Exception as e:
            logger.error(f"Erro ao decodificar base64 para {path}: {e}")
            return None

    def upload_bytes(
        self,
        image_bytes: bytes,
        path: str,
        content_type: str = "image/jpeg",
    ) -> Optional[str]:
        """
        Faz upload de bytes de imagem para o Storage.
        Retorna URL pública ou None em caso de erro.
        """
        try:
            resp = requests.post(
                f"{self.storage_url}/{path}",
                data=image_bytes,
                headers={
                    **self.headers,
                    "Content-Type": content_type,
                    "x-upsert": "true",  # Sobrescrever se já existir
                },
                timeout=30,
            )
            
            if resp.status_code in (200, 201):
                public_url = f"{self.supabase_url}/storage/v1/object/public/{self.bucket}/{path}"
                logger.debug(f"Upload OK: {path}")
                return public_url
            else:
                logger.warning(f"Upload falhou ({resp.status_code}): {path} — {resp.text[:200]}")
                return None
        except Exception as e:
            logger.error(f"Erro no upload de {path}: {e}")
            return None

    def make_path(self, camera_serial: str, event_id: str, image_type: str) -> str:
        """Gera caminho padronizado para a imagem no Storage."""
        from datetime import datetime
        date_prefix = datetime.utcnow().strftime("%Y/%m/%d")
        return f"{date_prefix}/{camera_serial}/{event_id}_{image_type}.jpg"
