import json
import pika
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.audit.models import AuditLog

class Command(BaseCommand):
    help = 'Consume audit logs from RabbitMQ and save to database'

    def handle(self, *args, **options):
        broker_url = getattr(settings, 'RABBITMQ_URL', 'amqp://adaptix:adaptix123@rabbitmq:5672/')
        params = pika.URLParameters(broker_url)
        connection = pika.BlockingConnection(params)
        channel = connection.channel()

        # Declare exchange
        channel.exchange_declare(exchange='audit_logs', exchange_type='topic', durable=True)

        # Declare a durable queue for centralized auditing
        result = channel.queue_declare(queue='central_audit_queue', durable=True)
        queue_name = result.method.queue

        # Bind to all audit events (audit.post, audit.put, etc.)
        channel.queue_bind(exchange='audit_logs', queue=queue_name, routing_key='audit.#')

        self.stdout.write(self.style.SUCCESS(' [*] Waiting for audit logs. To exit press CTRL+C'))

        def callback(ch, method, properties, body):
            try:
                data = json.loads(body)
                self.stdout.write(f" [x] Received audit event from {data.get('service_name', 'unknown')}: {method.routing_key}")
                
                # Save to database using the ledger-secured manager
                AuditLog.objects.create_with_ledger(
                    user_id=data.get('user_id'),
                    username=data.get('username'),
                    company_uuid=data.get('company_uuid'),
                    service_name=data.get('service_name', 'unknown'),
                    path=data.get('path', ''),
                    method=data.get('method', ''),
                    status_code=data.get('status_code', 0),
                    ip=data.get('ip_address'),
                    user_agent=data.get('user_agent'),
                    payload_preview=data.get('payload_preview'),
                    request_body=json.dumps(data.get('payload_preview')) if data.get('payload_preview') else ''
                )
                
                ch.basic_ack(delivery_tag=method.delivery_tag)
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"Error processing audit event: {e}"))
                # Optionally nack or dlq
                ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)

        channel.basic_qos(prefetch_count=1)
        channel.basic_consume(queue=queue_name, on_message_callback=callback)

        channel.start_consuming()
