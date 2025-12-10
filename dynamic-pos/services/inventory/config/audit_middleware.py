import json
import threading
from kombu import Connection, Exchange, Producer, Queue
from django.conf import settings

class AuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.broker_url = getattr(settings, "CELERY_BROKER_URL", "amqp://guest:guest@rabbitmq:5672//")
        self.exchange_name = "audit_logs"
        self.exchange = Exchange(self.exchange_name, type="fanout", durable=True)

    def __call__(self, request):
        response = self.get_response(request)

        if request.method in ["POST", "PUT", "PATCH", "DELETE"]:
            self.log_request(request, response)

        return response

    def log_request(self, request, response):
        try:
            threading.Thread(target=self._publish_log, args=(request, response)).start()
        except Exception as e:
            print(f"Audit log error: {e}")

    def _publish_log(self, request, response):
        try:
            user = getattr(request, "user_claims", {})
            user_id = user.get("user_id") if user else None
            path = request.path
            
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip = x_forwarded_for.split(',')[0]
            else:
                ip = request.META.get('REMOTE_ADDR')

            meta = str(response.status_code)
            
            log_entry = {
                "user_id": user_id,
                "path": path,
                "method": request.method,
                "status_code": response.status_code,
                "payload": {}, # Body read is hard without specialized middleware wrapper
                "meta": meta,
                "ip": ip,
                "service": "inventory-service"
            }

            with Connection(self.broker_url) as conn:
                producer = Producer(conn)
                producer.publish(
                    log_entry,
                    exchange=self.exchange,
                    routing_key="audit.inventory",
                    declare=[self.exchange],
                    retry=True
                )
        except Exception as e:
            print(f"Failed to publish audit log: {e}")
