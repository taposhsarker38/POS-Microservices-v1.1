import json
from django.core.management.base import BaseCommand
from kombu import Connection, Exchange, Queue, Consumer
from django.conf import settings
from apps.audit.models import AuditLog
from django.contrib.auth import get_user_model

User = get_user_model()

class Command(BaseCommand):
    help = 'Runs the Audit Log Consumer'

    def handle(self, *args, **options):
        broker_url = settings.CELERY_BROKER_URL
        exchange = Exchange("audit_logs", type="fanout", durable=True)
        queue = Queue("audit_queue", exchange=exchange, routing_key="audit.#")

        self.stdout.write(f"Listening for audit logs on {broker_url}...")

        with Connection(broker_url) as conn:
            with Consumer(conn, queues=[queue], callbacks=[self.process_message], accept=['json']):
                while True:
                    conn.drain_events()

    def process_message(self, body, message):
        try:
            data = body
            # data structure expected: {user_id, path, method, status_code, body, ip, service, timestamp}
            
            # Try to resolve User if user_id is passed (and it matches auth db)
            user = None
            if data.get("user_id"):
                try:
                    user = User.objects.get(id=data["user_id"])
                except User.DoesNotExist:
                    pass
            
            AuditLog.objects.create_with_ledger(
                user_id=data.get("user_id"),
                username=data.get("username", "system"),
                company_uuid=data.get("company_uuid"),
                service_name=data.get("service", "unknown"),
                path=data.get("path", "")[:400],
                method=data.get("method", "LOG"),
                status_code=data.get("status_code", 200),
                request_body=json.dumps(data.get("payload_preview", {})),
                payload_preview=data.get("payload_preview", {}),
                response_body=data.get("response_body", ""),
                ip=data.get("ip_address", "0.0.0.0"),
                user_agent=data.get("user_agent", "")
            )
            self.stdout.write(f"Logged action from {data.get('service')}")
            message.ack()
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error processing audit: {e}"))
            # message.reject() # Don't reject for now to avoid loops
            message.ack()
