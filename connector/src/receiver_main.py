"""
GuardIA Connector — Novo caminho de ingestão (push HTTP + MQTT).

Entrypoint separado de `main.py` de propósito: `main.py` e
`p6s_client.py` implementam o polling CGI antigo (endpoints inventados,
sem ACK) e ficam congelados até a bancada (P6S-09) validar o device
respondendo `statusCode 0` — regra dos dois connectors, CLAUDE.md §14.6.
Este módulo não depende disso: implementa só a camada de transporte
documentada em CLAUDE.md §3.2/§3.3 (push é o canal primário; polling de
eventos é proibido) e por isso não importa nada de `main.py`/`p6s_client.py`.

O sink ainda é `LoggingSink` (core_sink.py) — a escrita real no GuardIA
Core espera PND-16 (coluna de tenancy) e a decisão de arquitetura sobre
service_role/endpoint de ingestão (CLAUDE.md §14.3).

Uso:
  python receiver_main.py                          # usa config/config.yaml
  python receiver_main.py --config /path/to.yaml
"""
import argparse
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from loguru import logger

from config import load_config, AppConfig
from core_sink import CoreSink, LoggingSink
from ingest_state import IngestStateManager
from ingest_store import SqliteIngestStore, purge_all
from mqtt_receiver import MqttReceiver
from push_receiver import run_push_receiver


def setup_logging(log_level: str = "INFO") -> None:
    logger.remove()
    logger.add(
        sys.stdout,
        level=log_level,
        format="<green>{time:HH:mm:ss}</green> | <level>{level: <8}</level> | {message}",
        colorize=True,
    )
    logger.add(
        Path(__file__).parent.parent / "logs" / "receiver.log",
        level="DEBUG",
        rotation="10 MB",
        retention="7 days",
        format="{time:YYYY-MM-DD HH:mm:ss} | {level: <8} | {message}",
    )


def run(config: AppConfig, sink: CoreSink = None) -> None:
    sink = sink or LoggingSink()
    store = SqliteIngestStore(config.ingestion.state_db_path)
    state_manager = IngestStateManager(store)

    logger.info("=" * 60)
    logger.info("GuardIA Connector — Receptor de ingestão (push/MQTT)")
    logger.info(f"  HTTP push: {config.ingestion.http_host}:{config.ingestion.http_port}{config.ingestion.http_path}")
    logger.info(f"  MQTT: {'ativo' if config.mqtt.enabled else 'desativado'} ({config.mqtt.broker_host or '—'})")
    logger.info(f"  Devices configurados: {len(config.cameras)}")
    logger.info(f"  Sink: {type(sink).__name__} (escrita real aguarda PND-16 — CLAUDE.md §14.3)")
    logger.info(f"  Estado persistido: {config.ingestion.state_db_path} "
                f"({store.pending_count()} na fila, retomando)")
    logger.info(f"  Retenção do payload bruto: {config.ingestion.raw_retention_days}d (CORE-05 §2)")
    logger.info("  main.py (polling CGI) permanece congelado — regra dos dois connectors (CLAUDE.md §14.6)")
    logger.info("=" * 60)

    run_push_receiver(config, state_manager, sink)

    mqtt_receiver = MqttReceiver(config, state_manager, sink)
    mqtt_receiver.start()

    logger.info("Receptor rodando. Pressione Ctrl+C para parar.")
    raw_ttl = config.ingestion.raw_retention_days * 24 * 3600
    ultimo_purge = 0.0
    try:
        while True:
            for device in state_manager.all_devices():
                delivered = device.retry_queue.process_due(sink.deliver)
                if delivered:
                    logger.debug(f"[{device.device_serial}] {delivered} evento(s) da fila de retry entregues")

            # Expurgo de hora em hora — a parte do job `purge` do CORE-01 §7
            # que é responsabilidade do connector (bruto e dedupe). Mídia e
            # metadado do evento são do core.
            agora = time.monotonic()
            if agora - ultimo_purge > 3600:
                purge_all(store, raw_retention_seconds=raw_ttl)
                ultimo_purge = agora

            time.sleep(2)
    except KeyboardInterrupt:
        logger.info("Receptor encerrado pelo usuário.")
        mqtt_receiver.stop()


def main():
    parser = argparse.ArgumentParser(description="GuardIA — Receptor de push/MQTT (P6S)")
    parser.add_argument("--config", default=None, help="Caminho para config.yaml")
    parser.add_argument("--log-level", default=None, help="DEBUG, INFO, WARNING, ERROR")
    args = parser.parse_args()

    try:
        config = load_config(args.config)
    except ValueError as e:
        print(f"ERRO de configuração: {e}")
        sys.exit(1)

    setup_logging(args.log_level or config.connector.log_level)
    run(config)


if __name__ == "__main__":
    main()
