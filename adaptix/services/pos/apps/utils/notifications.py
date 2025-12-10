import json
import threading
from kombu import Connection, Exchange, Producer
from django.conf import settings
import time

def send_notification(user_id, message, event_type="info", payload=None):
    """
    Publishes a notification event to RabbitMQ.
    """
    try:
        broker_url = settings.CELERY_BROKER_URL
        exchange = Exchange("notifications", type="fanout", durable=True)
        
        notification_data = {
            "user_id": user_id, # Target User
            "message": message,
            "type": event_type,
            "payload": payload or {},
            "timestamp": time.time()
        }

        with Connection(broker_url) as conn:
            producer = Producer(conn)
            producer.publish(
                notification_data,
                exchange=exchange,
                routing_key="notify.user",
                serializer="json",
                declare=[exchange]
            )
    except Exception as e:
        print(f"Failed to publish notification: {e}")

def notify_background(user_id, message, event_type="info", payload=None):
    """Fire and forget notification"""
    t = threading.Thread(target=send_notification, args=(user_id, message, event_type, payload))
    t.start()
