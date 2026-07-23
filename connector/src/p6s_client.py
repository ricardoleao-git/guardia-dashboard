"""
GuardIA Connector — Cliente HTTP para câmeras P6S (Provision ISR).

A API P6SHTTP usa endpoints CGI para consultar eventos de reconhecimento facial.
Documentação: P6S HTTP API v2.x

Endpoints principais:
  GET /cgi-bin/operator/face_reco_search.cgi  → busca eventos de face
  GET /cgi-bin/snapshot.cgi                   → snapshot da câmera
  GET /cgi-bin/operator/get_face_image.cgi    → imagem de cadastro
"""
import hashlib
import time
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

import requests
from requests.auth import HTTPDigestAuth
from loguru import logger

from config import CameraConfig


class P6SClient:
    """Cliente para uma câmera P6S individual."""

    def __init__(self, camera: CameraConfig, timeout: int = 10):
        self.camera = camera
        self.timeout = timeout
        self.base_url = f"http://{camera.ip}:{camera.port}"
        self.auth = HTTPDigestAuth(camera.username, camera.password)
        self._last_event_time: Optional[str] = None
        self._session = requests.Session()
        self._session.auth = self.auth

    def is_online(self) -> bool:
        """Verifica se a câmera está acessível."""
        try:
            resp = self._session.get(
                f"{self.base_url}/cgi-bin/snapshot.cgi",
                timeout=5,
                stream=True,
            )
            resp.close()
            return resp.status_code in (200, 401)
        except Exception:
            return False

    def get_snapshot(self) -> Optional[bytes]:
        """Captura snapshot atual da câmera."""
        try:
            resp = self._session.get(
                f"{self.base_url}/cgi-bin/snapshot.cgi",
                timeout=self.timeout,
            )
            if resp.status_code == 200:
                return resp.content
        except Exception as e:
            logger.warning(f"[{self.camera.serial}] Snapshot falhou: {e}")
        return None

    def fetch_face_events(
        self,
        start_time: Optional[str] = None,
        max_count: int = 50,
    ) -> List[Dict[str, Any]]:
        """
        Busca eventos de reconhecimento facial via P6SHTTP.
        
        Retorna lista de eventos no formato normalizado do GuardIA.
        """
        try:
            # Parâmetros da query P6S
            params = {
                "action": "search",
                "count": max_count,
                "order": "desc",
            }
            if start_time:
                params["starttime"] = start_time

            resp = self._session.get(
                f"{self.base_url}/cgi-bin/operator/face_reco_search.cgi",
                params=params,
                timeout=self.timeout,
            )

            if resp.status_code != 200:
                logger.warning(
                    f"[{self.camera.serial}] face_reco_search retornou {resp.status_code}"
                )
                return []

            return self._parse_face_events(resp.json())

        except requests.exceptions.ConnectionError:
            logger.error(f"[{self.camera.serial}] Câmera offline ({self.camera.ip})")
            return []
        except Exception as e:
            logger.error(f"[{self.camera.serial}] Erro ao buscar eventos: {e}")
            return []

    def _parse_face_events(self, raw: Any) -> List[Dict[str, Any]]:
        """
        Converte resposta P6S para formato normalizado GuardIA.
        
        Estrutura P6S esperada:
        {
          "Records": [
            {
              "RecordID": "...",
              "Time": "2025-07-23T10:30:00",
              "FaceList": "WhiteList",
              "PersonName": "João Silva",
              "FaceScore": 95,
              "RecognizeImage": "base64...",
              "CaptureImage": "base64...",
              "Attributes": {"Gender": "Male", "Age": "30-40", ...}
            }
          ]
        }
        """
        events = []
        records = raw.get("Records", raw.get("records", []))
        
        for rec in records:
            try:
                # Normalizar campos P6S → GuardIA
                event_id = rec.get("RecordID") or rec.get("record_id") or str(uuid.uuid4())
                event_time_raw = rec.get("Time") or rec.get("time") or datetime.now(timezone.utc).isoformat()
                
                # Normalizar face_list
                face_list_raw = rec.get("FaceList") or rec.get("face_list") or "Stranger"
                face_list = self._normalize_face_list(face_list_raw)
                
                # Score (0-100)
                score_raw = rec.get("FaceScore") or rec.get("face_score") or 0
                face_score = int(score_raw) if score_raw else 0
                
                # Atributos (gênero, idade, óculos, máscara)
                attrs_raw = rec.get("Attributes") or rec.get("attributes") or {}
                attributes = self._normalize_attributes(attrs_raw)
                
                events.append({
                    "event_id": f"{self.camera.serial}-{event_id}",
                    "camera_serial": self.camera.serial,
                    "camera_name": f"{self.camera.serial} · {self.camera.location}",
                    "event_type": "face",
                    "face_list": face_list,
                    "person_name": rec.get("PersonName") or rec.get("person_name"),
                    "face_score": face_score,
                    "recognize_image": rec.get("RecognizeImage") or rec.get("recognize_image"),
                    "capture_image": rec.get("CaptureImage") or rec.get("capture_image"),
                    "event_time": event_time_raw,
                    "attributes": attributes,
                })
            except Exception as e:
                logger.warning(f"[{self.camera.serial}] Erro ao parsear evento: {e} | raw={rec}")
                continue
        
        return events

    def _normalize_face_list(self, raw: str) -> str:
        """Normaliza o nome da lista facial P6S para o padrão GuardIA."""
        mapping = {
            "whitelist": "WhiteList",
            "white_list": "WhiteList",
            "white list": "WhiteList",
            "lista branca": "WhiteList",
            "blacklist": "BlackList",
            "black_list": "BlackList",
            "black list": "BlackList",
            "lista negra": "BlackList",
            "stranger": "Stranger",
            "estranho": "Stranger",
            "unknown": "Stranger",
        }
        return mapping.get(raw.lower().strip(), raw)

    def _normalize_attributes(self, attrs: Dict) -> Dict:
        """Normaliza atributos P6S para o padrão GuardIA."""
        result = {}
        
        gender_map = {"male": "M", "female": "F", "masculino": "M", "feminino": "F"}
        gender = attrs.get("Gender") or attrs.get("gender") or ""
        if gender:
            result["gender"] = gender_map.get(gender.lower(), gender)
        
        age = attrs.get("Age") or attrs.get("age") or ""
        if age:
            result["age"] = str(age)
        
        glasses = attrs.get("Glasses") or attrs.get("glasses")
        if glasses is not None:
            result["glasses"] = bool(glasses)
        
        mask = attrs.get("Mask") or attrs.get("mask")
        if mask is not None:
            result["mask"] = bool(mask)
        
        return result

    def get_face_image(self, person_name: str) -> Optional[bytes]:
        """Busca imagem de cadastro de uma pessoa na lista facial."""
        try:
            resp = self._session.get(
                f"{self.base_url}/cgi-bin/operator/get_face_image.cgi",
                params={"name": person_name},
                timeout=self.timeout,
            )
            if resp.status_code == 200:
                return resp.content
        except Exception as e:
            logger.warning(f"[{self.camera.serial}] get_face_image falhou para {person_name}: {e}")
        return None
