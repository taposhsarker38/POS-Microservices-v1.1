
import os
from kombu import Connection, Exchange, Producer

AMQP_URL = os.getenv("CELERY_BROKER_URL", "amqp://guest:guest@rabbitmq:5672/")
EXCHANGE_NAME = os.getenv("AMQP_EXCHANGE", "events")

def publish_event(event: str, data: dict, rooms: list = None):
    exchange = Exchange(EXCHANGE_NAME, type="fanout")
    payload = {"event": event, "data": data}
    if rooms:
        payload["rooms"] = rooms
    with Connection(AMQP_URL) as conn:
        producer = Producer(conn)
        producer.publish(payload, exchange=exchange, serializer="json")
