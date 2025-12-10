import json
from django.core.management.base import BaseCommand
from kombu import Connection, Exchange, Queue, Consumer
from django.conf import settings
from apps.procurement.models import PurchaseOrder

class Command(BaseCommand):
    help = 'Runs the Purchase Saga Consumer'

    def handle(self, *args, **options):
        broker_url = getattr(settings, "CELERY_BROKER_URL", "amqp://guest:guest@rabbitmq:5672//")
        exchange = Exchange("events", type="fanout", durable=False)
        # Bind to result events
        queue = Queue("purchase_saga_updates", exchange=exchange, routing_key="stock.update.*")

        self.stdout.write(f"Listening for saga events on {broker_url}...")

        with Connection(broker_url) as conn:
            with Consumer(conn, queues=[queue], callbacks=[self.process_message], accept=['json']):
                while True:
                    conn.drain_events()

    def process_message(self, body, message):
        try:
            data = body
            routing_key = message.delivery_info.get('routing_key')
            
            # Filter only relevant events
            if routing_key not in ["stock.update.success", "stock.update.failed"]:
                message.ack()
                return

            order_reference = data.get("order_reference")
            company_uuid = data.get("company_uuid") # Optional check

            if not order_reference:
                message.ack()
                return

            try:
                # Find PO by reference (assuming unique per company in V1 or globally enough)
                # Ideally filter by company_uuid too
                order = PurchaseOrder.objects.get(reference_number=order_reference)
                
                if routing_key == "stock.update.success":
                    if order.status == 'processing':
                         order.status = 'received'
                         order.save()
                         self.stdout.write(self.style.SUCCESS(f"Saga Complete: PO {order_reference} -> RECEIVED"))
                
                elif routing_key == "stock.update.failed":
                    if order.status == 'processing':
                        order.status = 'cancelled'
                        order.notes = f"{order.notes or ''} [System]: Inventory update failed: {data.get('error')}"
                        order.save()
                        self.stdout.write(self.style.WARNING(f"Saga Compensation: PO {order_reference} -> CANCELLED"))

            except PurchaseOrder.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"PO {order_reference} not found"))

            message.ack()

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error processing saga: {e}"))
            message.ack()
