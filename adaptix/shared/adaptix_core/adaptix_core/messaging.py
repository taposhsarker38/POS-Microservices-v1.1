import pika
import json
import os
from django.conf import settings

def publish_event(exchange, routing_key, payload):
    """
    Publish an event to RabbitMQ using generic settings.
    """
    try:
        broker_url = getattr(settings, 'RABBITMQ_URL', os.environ.get('RABBITMQ_URL', 'amqp://adaptix:adaptix123@rabbitmq:5672/'))
        
        # Connection parameters with strict timeouts
        params = pika.URLParameters(broker_url)
        params.connection_attempts = 2
        params.retry_delay = 1
        params.socket_timeout = 5
        params.blocked_connection_timeout = 5
        
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
        print(f"[Core] Failed to publish event {routing_key}: {e}")
