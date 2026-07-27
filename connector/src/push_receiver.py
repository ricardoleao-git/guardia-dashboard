"""
GuardIA Connector — Receptor de push HTTP (P6SHTTP).

Canal primário (CLAUDE.md §3.2). O device é configurado via
`PUT /System/HTTPEventServerConfigV2` (configuração fica do lado do
driver CGI, fora deste módulo) para apontar o push para este endpoint.

[LACUNA] dois pontos que só a bancada resolve — heurística com fallback
em vez de suposição silenciosa:
  1. Como o device se identifica no corpo do push (`_extract_device_serial`).
  2. Como o device sinaliza que o push é um Heartbeat, não um evento
     (`_is_heartbeat`).
"""
import threading
import time
from typing import Any, Dict, Optional

from flask import Flask, jsonify, request
from loguru import logger

from canonical_events import CanonicalEventError
from config import AppConfig, CameraConfig
from core_sink import CoreSink
from ingest_state import IngestStateManager
from p6s_event_translator import translate_push_body, UnrecognizedRawEventType
from push_auth import PushAuthVerifier
from strategy import build_ack_strategy, UnknownVerticalError


def _extract_device_serial(raw: Dict[str, Any], query_hint: Optional[str]) -> Optional[str]:
    for key in ("device_serial", "DeviceSerial", "SerialNumber", "camera_serial"):
        if raw.get(key):
            return str(raw[key])
    return query_hint


def _is_heartbeat(raw: Dict[str, Any]) -> bool:
    marker = str(raw.get("MessageType") or raw.get("event_type") or "").lower()
    return marker == "heartbeat"


def create_app(config: AppConfig, state_manager: IngestStateManager, sink: CoreSink) -> Flask:
    app = Flask(__name__)
    cameras_by_serial: Dict[str, CameraConfig] = {c.serial: c for c in config.cameras}
    auth_verifier = PushAuthVerifier(mode=config.ingestion.push_auth_mode)

    @app.get("/healthz")
    def healthz():
        return jsonify({"status": "ok", "devices": len(cameras_by_serial)})

    @app.post(config.ingestion.http_path)
    def receive_push():
        raw = request.get_json(silent=True) or {}
        device_serial = _extract_device_serial(raw, request.args.get("device"))

        if not device_serial or device_serial not in cameras_by_serial:
            logger.warning(f"[push_receiver] device não identificado/registrado: {device_serial!r}")
            return jsonify({"error": "device desconhecido"}), 404

        camera = cameras_by_serial[device_serial]

        oauth_params = {**request.args.to_dict(), **{k: v for k, v in raw.items() if k.startswith("oauth_")}}
        # CLAUDE.md §3.2: user_secret = serial do device (não a senha).
        if not auth_verifier.verify(
            method=request.method, url=request.url, params=oauth_params, device_secret=camera.serial
        ):
            return jsonify({"error": "assinatura inválida"}), 401

        state = state_manager.get_or_create(device_serial)

        if _is_heartbeat(raw):
            state.last_heartbeat_at = time.time()
            try:
                strategy = build_ack_strategy(
                    vertical=camera.vertical,
                    heartbeat_interval_seconds=config.connector.heartbeat_interval_seconds,
                )
            except UnknownVerticalError as e:
                logger.error(f"[push_receiver] {e}")
                return jsonify({"error": str(e)}), 500
            state.last_strategy_sent = strategy
            # CLAUDE.md §3.2: sem este Ack o device para de mandar eventos.
            return jsonify({"strategy": strategy}), 200

        try:
            event = translate_push_body(raw, source_channel="http", device_serial=device_serial)
        except UnrecognizedRawEventType as e:
            logger.error(f"[push_receiver] {e}")
            return jsonify({"error": str(e)}), 422
        except CanonicalEventError as e:
            logger.error(f"[push_receiver] evento inválido: {e}")
            return jsonify({"error": str(e)}), 422

        if state.dedupe.is_duplicate(event.event_id):
            logger.debug(f"[push_receiver] duplicado ignorado: {event.event_id}")
            return jsonify({"status": "duplicate"}), 200

        state.retry_queue.enqueue(event)
        delivered = state.retry_queue.process_due(sink.deliver)
        logger.info(f"[push_receiver] evento {event.event_id} enfileirado ({delivered} entregue(s) agora)")
        return jsonify({"status": "accepted"}), 202

    return app


def run_push_receiver(config: AppConfig, state_manager: IngestStateManager, sink: CoreSink) -> threading.Thread:
    """Roda o receptor HTTP em thread separada (uso em receiver_main.py)."""
    app = create_app(config, state_manager, sink)

    def _serve():
        app.run(host=config.ingestion.http_host, port=config.ingestion.http_port, threaded=True)

    thread = threading.Thread(target=_serve, daemon=True, name="push-receiver")
    thread.start()
    return thread
