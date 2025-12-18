import pika
import json
import os
from django.conf import settings

def publish_event(exchange, routing_key, payload):
    """
    Publish an event to RabbitMQ using generic settings.
    """
    try:
        broker_url = getattr(settings, 'RABBITMQ_URL', 'amqp://guest:guest@rabbitmq:5672/')
        params = pika.URLParameters(broker_url)
        connection = pika.BlockingConnection(params)
        channel = connection.channel()
        
        channel.exchange_declare(exchange=exchange, exchange_type='topic', durable=True)
        
        channel.basic_publish(
            exchange=exchange,
            routing_key=routing_key,
            body=json.dumps(payload),
            properties=pika.BasicProperties(
                delivery_mode=2,  # make message persistent
            )
        )
        connection.close()
        print(f"[Core] Published event: {routing_key}")
    except Exception as e:
        print(f"[Core] Failed to publish event: {e}")
