from config.celery import app
from kombu import Connection, Exchange, Producer
import os
import json

@app.task
def publish_event(exchange_name, routing_key, payload):
    with Connection(os.getenv("CELERY_BROKER_URL")) as conn:
        exchange = Exchange(exchange_name, type='topic', durable=True)
        producer = Producer(conn)
        producer.publish(payload, exchange=exchange, routing_key=routing_key, serializer='json', declare=[exchange])
