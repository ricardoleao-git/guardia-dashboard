"""
GuardIA Connector — Receptor MQTT (túnel P6S, CLAUDE.md §3.3).

"Payload de evento [HTTP] ≡ [MQTT]: mesmo corpo, envelope diferente" —
por isso este módulo reaproveita o mesmo `translate_push_body` do
receptor HTTP em vez de duplicar a tradução.

Fora de escopo aqui: o túnel de configuração/consulta CGI via MQTT
(`operator: "transportCGIConfig"`, CLAUDE.md §3.3) — isso é operação de
configuração de device, não de recepção de evento, e cai no mesmo
congelamento do `p6s_client.py` até a bancada validar (regra dos dois
connectors, §14.6).

[LACUNA] nome exato do tópico de eventos publicado pelo device — não
documentado no material disponível. `event_topic_pattern` em
`MqttConfig` é o ponto único para ajustar assim que confirmado (EMQX +
`PUT /System/P6SEventMQTTConfig` na bancada).
"""
from typing import Optional

import paho.mqtt.client as mqtt
from loguru import logger

from canonical_events import CanonicalEventError
from config import AppConfig
from core_sink import CoreSink
from ingest_state import IngestStateManager
from p6s_event_translator import translate_push_body


def _device_serial_from_topic(topic: str) -> Optional[str]:
    # Padrão hipotético "p6s/{serial}/events" — ajustar se o real for outro.
    parts = topic.split("/")
    return parts[1] if len(parts) >= 2 else None


class MqttReceiver:
    def __init__(self, config: AppConfig, state_manager: IngestStateManager, sink: CoreSink):
        self.config = config
        self.state_manager = state_manager
        self.sink = sink
        self.client = mqtt.Client()
        if config.mqtt.username:
            self.client.username_pw_set(config.mqtt.username, config.mqtt.password)
        if config.mqtt.use_tls:
            self.client.tls_set()
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message

    def _on_connect(self, client, userdata, flags, rc):
        if rc != 0:
            logger.error(f"[mqtt_receiver] falha ao conectar ao broker (rc={rc})")
            return
        topic = self.config.mqtt.event_topic_pattern
        client.subscribe(topic)
        logger.info(f"[mqtt_receiver] conectado, subscrito em {topic!r}")

    def _on_message(self, client, userdata, msg):
        import json

        try:
            raw = json.loads(msg.payload.decode("utf-8"))
        except Exception as e:
            logger.error(f"[mqtt_receiver] payload não é JSON válido em {msg.topic}: {e}")
            return

        device_serial = raw.get("device_serial") or _device_serial_from_topic(msg.topic)
        if not device_serial:
            logger.warning(f"[mqtt_receiver] não identifiquei o device no tópico {msg.topic!r}")
            return

        try:
            event = translate_push_body(raw, source_channel="mqtt", device_serial=device_serial)
        # Operador desconhecido vira 'unmapped' no tradutor, não exceção.
        except CanonicalEventError as e:
            logger.error(f"[mqtt_receiver] {e}")
            return

        state = self.state_manager.get_or_create(device_serial)
        if state.dedupe.is_duplicate(event.event_id):
            logger.debug(f"[mqtt_receiver] duplicado ignorado: {event.event_id}")
            return

        state.retry_queue.enqueue(event)
        state.retry_queue.process_due(self.sink.deliver)

    def start(self) -> None:
        if not self.config.mqtt.enabled:
            logger.info("[mqtt_receiver] desativado por config (mqtt.enabled=false)")
            return
        self.client.connect(self.config.mqtt.broker_host, self.config.mqtt.broker_port)
        self.client.loop_start()

    def stop(self) -> None:
        self.client.loop_stop()
        self.client.disconnect()
