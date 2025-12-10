import json
from django.core.management.base import BaseCommand
from kombu import Connection, Exchange, Queue, Consumer
from django.conf import settings
from apps.sales.models import Order

class Command(BaseCommand):
    help = 'Runs the POS Saga Consumer'

    def handle(self, *args, **options):
        broker_url = getattr(settings, "CELERY_BROKER_URL", "amqp://guest:guest@rabbitmq:5672//")
        exchange = Exchange("events", type="fanout", durable=False)
        # Bind to result events
        queue = Queue("pos_saga_updates", exchange=exchange, routing_key="stock.update.*")

        self.stdout.write(f"Listening for saga events on {broker_url}...")

        with Connection(broker_url) as conn:
            with Consumer(conn, queues=[queue], callbacks=[self.process_message], accept=['json']):
                while True:
                    conn.drain_events()

    def process_message(self, body, message):
        try:
            data = body
            routing_key = message.delivery_info.get('routing_key')
            
            if routing_key not in ["stock.update.success", "stock.update.failed"]:
                message.ack()
                return

            # Check if this event relates to a Sale
            reason = data.get("order_reference") or data.get("reason")
            if not reason or "Sale #" not in str(reason):
                # Takes care of "PO #" events which are for Purchase service
                message.ack()
                return

            sale_id = str(reason).replace("Sale #", "")
            
            try:
                order = Order.objects.get(id=sale_id)
                
                if routing_key == "stock.update.failed":
                    # Saga Compensation: Inventory failed!
                    # For POS, the customer might have already left (Optimistic UI). 
                    # We must flag this for manual review/refund.
                    order.status = 'error' # Or 'cancelled'
                    order.notes = f"{order.notes or ''} [System]: Inventory Failed: {data.get('error')}"
                    order.save()
                    self.stdout.write(self.style.WARNING(f"Saga Compensation: Sale {sale_id} -> ERROR"))
                
                elif routing_key == "stock.update.success":
                    self.stdout.write(self.style.SUCCESS(f"Saga Complete: Sale {sale_id} Confirmed"))

            except Exception as e:
                # Order might utilize UUID or ID depending on model. 
                # If lookup fails, it's fine.
                self.stdout.write(self.style.ERROR(f"Sale {sale_id} not found or update failed: {e}"))

            message.ack()

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error processing saga: {e}"))
            message.ack()
