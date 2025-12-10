# services/auth/apps/core/events.py
import json
import time
from kombu import Connection, Exchange, Producer
from django.conf import settings

EXCHANGE_NAME = getattr(settings, "AMQP_EXCHANGE", "events")
BROKER_URL = getattr(settings, "CELERY_BROKER_URL", "amqp://guest:guest@rabbitmq:5672/")

exchange = Exchange(EXCHANGE_NAME, type="topic", durable=True)

def publish_event(event_name: str, data: dict, routing_key: str = "auth"):
    payload = {
        "event": event_name,
        "data": data,
        "meta": {
            "source": getattr(settings, "SERVICE_NAME", "auth-service"),
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
    }
    with Connection(BROKER_URL) as conn:
        producer = Producer(conn)
        producer.publish(
            payload,
            exchange=exchange,
            routing_key=routing_key,
            serializer="json",
            declare=[exchange],
            retry=True,
            retry_policy={"max_retries": 3}
        )
