"""
GuardIA Connector — Ponto de entrada principal.

Loop de polling: a cada N segundos, busca eventos de cada câmera P6S
e envia para o Supabase em tempo real.

Uso:
  python main.py                          # Usa config/config.yaml
  python main.py --config /path/to.yaml   # Config customizado
  python main.py --dry-run                # Não envia ao Supabase
"""
import argparse
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Optional

# Adicionar src/ ao path para imports locais
sys.path.insert(0, str(Path(__file__).parent))

from loguru import logger
import schedule

from config import load_config, AppConfig, CameraConfig
from p6s_client import P6SClient
from supabase_sink import SupabaseSink
from image_uploader import ImageUploader
from event_mapper import EventMapper


# ===== Estado global =====
camera_clients: Dict[str, P6SClient] = {}
last_event_times: Dict[str, Optional[str]] = {}
total_events_sent: int = 0


def setup_logging(log_level: str = "INFO"):
    """Configura o logger."""
    logger.remove()
    logger.add(
        sys.stdout,
        level=log_level,
        format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | {message}",
        colorize=True,
    )
    logger.add(
        Path(__file__).parent.parent / "logs" / "connector.log",
        level="DEBUG",
        rotation="10 MB",
        retention="7 days",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {message}",
    )


def poll_camera(
    camera: CameraConfig,
    client: P6SClient,
    sink: SupabaseSink,
    mapper: EventMapper,
    config: AppConfig,
    dry_run: bool = False,
):
    """Faz polling de uma câmera e envia eventos ao Supabase."""
    global total_events_sent

    if not camera.enabled:
        return

    logger.debug(f"[{camera.serial}] Polling {camera.ip}...")

    # Buscar a partir do último evento conhecido
    start_time = last_event_times.get(camera.serial)
    
    raw_events = client.fetch_face_events(
        start_time=start_time,
        max_count=config.connector.max_events_per_poll,
    )

    if not raw_events:
        logger.debug(f"[{camera.serial}] Nenhum evento novo")
        return

    logger.info(f"[{camera.serial}] {len(raw_events)} eventos encontrados")

    # Processar e enviar
    processed = []
    for raw in raw_events:
        try:
            event = mapper.process(raw)
            processed.append(event)
        except Exception as e:
            logger.error(f"[{camera.serial}] Erro ao processar evento: {e}")

    if processed and not dry_run:
        sent = sink.insert_events_batch(processed)
        total_events_sent += sent
        logger.info(f"[{camera.serial}] {sent}/{len(processed)} eventos enviados ao Supabase")

        # Atualizar timestamp do último evento
        if processed:
            last_event_times[camera.serial] = processed[0].get("event_time")
    elif dry_run:
        logger.info(f"[{camera.serial}] DRY-RUN: {len(processed)} eventos (não enviados)")


def heartbeat(config: AppConfig, sink: SupabaseSink):
    """Envia heartbeat e status das câmeras ao Supabase."""
    cameras_status = {}
    for serial, client in camera_clients.items():
        online = client.is_online()
        cameras_status[serial] = {
            "online": online,
            "ip": client.camera.ip,
            "model": client.camera.model,
            "location": client.camera.location,
            "last_event": last_event_times.get(serial),
        }
        status_icon = "✓" if online else "✗"
        logger.info(f"  [{serial}] {status_icon} {client.camera.ip} ({client.camera.model})")

    sink.update_connector_status(
        connector_id=config.connector.id,
        online=True,
        total_events=total_events_sent,
        cameras_status=cameras_status,
    )


def run(config: AppConfig, dry_run: bool = False):
    """Loop principal do connector."""
    global camera_clients, last_event_times

    logger.info("=" * 60)
    logger.info("GuardIA Connector — Iniciando")
    logger.info(f"  Connector ID: {config.connector.id}")
    logger.info(f"  Supabase: {config.supabase.url}")
    logger.info(f"  Câmeras: {len(config.cameras)} configuradas")
    logger.info(f"  Poll interval: {config.connector.poll_interval_seconds}s")
    logger.info(f"  Dry-run: {dry_run}")
    logger.info("=" * 60)

    # Inicializar clientes
    sink = SupabaseSink(config.supabase.url, config.supabase.service_role_key)
    
    uploader = None
    if config.connector.image_upload:
        uploader = ImageUploader(config.supabase.url, config.supabase.service_role_key)
    
    mapper = EventMapper(
        uploader=uploader,
        connector_id=config.connector.id,
        org_id=config.connector.org_id,
    )

    # Inicializar clientes de câmera
    for camera in config.cameras:
        if camera.enabled:
            client = P6SClient(camera)
            camera_clients[camera.serial] = client
            # Buscar timestamp do último evento no banco (evitar duplicatas no restart)
            last_event_times[camera.serial] = sink.get_last_event_time(camera.serial)
            logger.info(
                f"  [{camera.serial}] {camera.ip} ({camera.model}) — "
                f"último evento: {last_event_times.get(camera.serial) or 'nenhum'}"
            )

    # Agendar polling de cada câmera
    for camera in config.cameras:
        if camera.enabled:
            client = camera_clients[camera.serial]
            schedule.every(config.connector.poll_interval_seconds).seconds.do(
                poll_camera,
                camera=camera,
                client=client,
                sink=sink,
                mapper=mapper,
                config=config,
                dry_run=dry_run,
            )

    # Agendar heartbeat
    schedule.every(config.connector.heartbeat_interval_seconds).seconds.do(
        heartbeat, config=config, sink=sink
    )

    # Executar uma vez imediatamente
    logger.info("Executando polling inicial...")
    for camera in config.cameras:
        if camera.enabled:
            poll_camera(
                camera=camera,
                client=camera_clients[camera.serial],
                sink=sink,
                mapper=mapper,
                config=config,
                dry_run=dry_run,
            )
    heartbeat(config, sink)

    # Loop principal
    logger.info("Connector rodando. Pressione Ctrl+C para parar.")
    try:
        while True:
            schedule.run_pending()
            time.sleep(1)
    except KeyboardInterrupt:
        logger.info("Connector encerrado pelo usuário.")
    except Exception as e:
        logger.critical(f"Erro fatal: {e}")
        raise


def main():
    parser = argparse.ArgumentParser(description="GuardIA P6S → Supabase Connector")
    parser.add_argument("--config", default=None, help="Caminho para config.yaml")
    parser.add_argument("--dry-run", action="store_true", help="Não envia ao Supabase")
    parser.add_argument("--log-level", default=None, help="DEBUG, INFO, WARNING, ERROR")
    args = parser.parse_args()

    try:
        config = load_config(args.config)
    except ValueError as e:
        print(f"ERRO de configuração: {e}")
        sys.exit(1)

    log_level = args.log_level or config.connector.log_level
    setup_logging(log_level)

    run(config, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
