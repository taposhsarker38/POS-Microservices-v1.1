import json
import threading
from kombu import Connection, Exchange, Producer
from django.conf import settings
import time

def send_audit_log(request, response=None, payload=None):
    """
    Publishes an audit log event to RabbitMQ.
    Should be called via a threading.Thread or Celery task to avoid blocking.
    """
    try:
        broker_url = settings.CELERY_BROKER_URL
        exchange = Exchange("audit_logs", type="fanout", durable=True)
        
        user_id = None
        # Extract user ID from JWT if available (Product/Company service specific)
        if hasattr(request, 'user_claims') and request.user_claims:
             user_id = request.user_claims.get("user_id")

        log_data = {
            "service": getattr(settings, "SERVICE_NAME", "unknown"),
            "path": request.path,
            "method": request.method,
            "status_code": response.status_code if response else 0,
            "payload": payload or {},
            "ip": request.META.get("REMOTE_ADDR"),
            "user_id": user_id,
            "timestamp": time.time()
        }

        with Connection(broker_url) as conn:
            producer = Producer(conn)
            producer.publish(
                log_data,
                exchange=exchange,
                routing_key="audit.log",
                serializer="json",
                declare=[exchange]
            )
    except Exception as e:
        print(f"Failed to publish audit log: {e}")

def audit_background(request, response):
    """Fire and forget audit log"""
    t = threading.Thread(target=send_audit_log, args=(request, response))
    t.start()
