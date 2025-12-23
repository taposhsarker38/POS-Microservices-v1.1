import pika
import json
import logging
from django.conf import settings

logger = logging.getLogger(__name__)

def publish_event(event_name, data, rooms=None):
    """
    Publish an event to the RabbitMQ 'events' exchange.
    The ws-gateway consumes from this exchange and broadcasts to clients.
    """
    try:
        broker_url = getattr(settings, 'RABBITMQ_URL', 'amqp://adaptix:adaptix123@rabbitmq:5672/')
        params = pika.URLParameters(broker_url)
        connection = pika.BlockingConnection(params)
        channel = connection.channel()
        
        # Ensure the exchange exists
        exchange = 'events'
        channel.exchange_declare(exchange=exchange, exchange_type='topic', durable=True)
        
        payload = {
            'event': event_name,
            'data': data,
            'rooms': rooms or []
        }
        
        channel.basic_publish(
            exchange=exchange,
            routing_key='', # broadcast or specific routing key
            body=json.dumps(payload),
            properties=pika.BasicProperties(
                delivery_mode=2,  # make message persistent
            )
        )
        connection.close()
        print(f"DEBUG: Published real-time event '{event_name}' to RabbitMQ")
        logger.info(f"Published event '{event_name}' to RabbitMQ")
    except Exception as e:
        print(f"DEBUG ERROR: Failed to publish event: {e}")
        logger.error(f"Failed to publish event: {e}")
