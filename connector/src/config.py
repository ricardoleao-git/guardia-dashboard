"""
GuardIA Connector — Carregamento de configuração.
Suporta config.yaml e variáveis de ambiente.
"""
import os
import yaml
from pathlib import Path
from dataclasses import dataclass, field
from typing import List, Optional


@dataclass
class CameraConfig:
    serial: str
    ip: str
    model: str
    location: str
    username: str = "admin"
    password: str = ""
    enabled: bool = True
    port: int = 80


@dataclass
class SupabaseConfig:
    url: str
    service_role_key: str


@dataclass
class ConnectorConfig:
    id: str = "connector-01"
    org_id: str = "default"
    poll_interval_seconds: int = 30
    heartbeat_interval_seconds: int = 60
    max_events_per_poll: int = 50
    image_upload: bool = True
    log_level: str = "INFO"


@dataclass
class WhatsAppConfig:
    enabled: bool = False
    phone_number_id: str = ""
    access_token: str = ""
    recipient_phone: str = ""
    alert_types: List[str] = field(default_factory=lambda: ["stranger", "blacklist", "access_denied", "alarm"])


@dataclass
class AppConfig:
    supabase: SupabaseConfig
    connector: ConnectorConfig
    cameras: List[CameraConfig] = field(default_factory=list)
    whatsapp: Optional[WhatsAppConfig] = None


def load_config(config_path: Optional[str] = None) -> AppConfig:
    """Carrega configuração do arquivo YAML ou variáveis de ambiente."""
    
    # Tentar carregar do arquivo YAML
    if config_path is None:
        config_path = Path(__file__).parent.parent / "config" / "config.yaml"
    
    raw = {}
    if Path(config_path).exists():
        with open(config_path, "r", encoding="utf-8") as f:
            raw = yaml.safe_load(f) or {}
    
    # Supabase — prioridade: env vars > config.yaml
    supabase_url = os.getenv("SUPABASE_URL") or raw.get("supabase", {}).get("url", "")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or raw.get("supabase", {}).get("service_role_key", "")
    
    if not supabase_url or not supabase_key:
        raise ValueError(
            "Supabase URL e service_role_key são obrigatórios.\n"
            "Configure via config/config.yaml ou variáveis de ambiente:\n"
            "  SUPABASE_URL=https://xxx.supabase.co\n"
            "  SUPABASE_SERVICE_ROLE_KEY=eyJ..."
        )
    
    supabase_cfg = SupabaseConfig(url=supabase_url, service_role_key=supabase_key)
    
    # Connector settings
    conn_raw = raw.get("connector", {})
    connector_cfg = ConnectorConfig(
        id=conn_raw.get("id", "connector-01"),
        org_id=conn_raw.get("org_id", "default"),
        poll_interval_seconds=int(conn_raw.get("poll_interval_seconds", 30)),
        heartbeat_interval_seconds=int(conn_raw.get("heartbeat_interval_seconds", 60)),
        max_events_per_poll=int(conn_raw.get("max_events_per_poll", 50)),
        image_upload=bool(conn_raw.get("image_upload", True)),
        log_level=conn_raw.get("log_level", "INFO"),
    )
    
    # Câmeras
    default_password = os.getenv("P6S_DEFAULT_PASSWORD", "")
    cameras = []
    for cam in raw.get("cameras", []):
        cameras.append(CameraConfig(
            serial=cam["serial"],
            ip=cam["ip"],
            model=cam.get("model", "Unknown"),
            location=cam.get("location", ""),
            username=cam.get("username", "admin"),
            password=cam.get("password", default_password),
            enabled=cam.get("enabled", True),
            port=int(cam.get("port", 80)),
        ))
    
    # WhatsApp (opcional)
    wa_raw = raw.get("whatsapp", {})
    whatsapp_cfg = None
    if wa_raw.get("enabled", False):
        whatsapp_cfg = WhatsAppConfig(
            enabled=True,
            phone_number_id=wa_raw.get("phone_number_id", ""),
            access_token=wa_raw.get("access_token", ""),
            recipient_phone=wa_raw.get("recipient_phone", ""),
            alert_types=wa_raw.get("alert_types", ["stranger", "blacklist", "access_denied", "alarm"]),
        )
    
    return AppConfig(supabase=supabase_cfg, connector=connector_cfg, cameras=cameras, whatsapp=whatsapp_cfg)
