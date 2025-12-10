import json
import threading
from kombu import Connection, Exchange, Producer, Queue
from django.conf import settings

# Global thread-local or pooled connection could be used, but for simplicity we open/close or use celery's default
# However, creating a connection per request is expensive. 
# A better approach for Django is using a resource pool or simply firing a celery task.
# But the requirement implies "middleware", and firing a celery task is async (good), but we want to capture the request details.
# Let's use a simple fire-and-forget publish using kombu (which celery uses).

class AuditMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.broker_url = getattr(settings, "CELERY_BROKER_URL", "amqp://guest:guest@rabbitmq:5672//")
        self.exchange_name = "audit_logs"
        self.exchange = Exchange(self.exchange_name, type="fanout", durable=True)

    def __call__(self, request):
        # Process request
        response = self.get_response(request)

        # Log only modification methods or if specifically interesting
        if request.method in ["POST", "PUT", "PATCH", "DELETE"]:
            self.log_request(request, response)

        return response

    def log_request(self, request, response):
        try:
            # Thread-safe logging
            threading.Thread(target=self._publish_log, args=(request, response)).start()
        except Exception as e:
            print(f"Audit log error: {e}")

    def _publish_log(self, request, response):
        try:
            user = getattr(request, "user_claims", {})
            user_id = user.get("user_id") if user else None
            
            # Extract Path
            path = request.path
            
            # Extract IP
            x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
            if x_forwarded_for:
                ip = x_forwarded_for.split(',')[0]
            else:
                ip = request.META.get('REMOTE_ADDR')

            # Extract Body (be careful with large bodies or files)
            # Django request.body might be consumed. 
            # In Middleware __call__, we accessed it? No.
            # If we access it here, it might check stream.
            # Safe text body:
            payload = {}
            # Need to handle this carefully. For now, skip full body or just log simple dicts if JSON
            # We can't easily re-read stream unless we cached it.
            
            meta = str(response.status_code)

            log_entry = {
                "user_id": user_id,
                "path": path,
                "method": request.method,
                "status_code": response.status_code,
                "payload": payload,
                "meta": meta,
                "ip": ip,
                "service": "purchase-service"
            }

            with Connection(self.broker_url) as conn:
                producer = Producer(conn)
                producer.publish(
                    log_entry,
                    exchange=self.exchange,
                    routing_key="audit.purchase",
                    declare=[self.exchange],
                    retry=True
                )
        except Exception as e:
            # Silent fail to not disrupt service
            print(f"Failed to publish audit log: {e}")
