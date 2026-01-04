import json
from django.core.management.base import BaseCommand
from kombu import Connection, Exchange, Queue, Consumer
from django.conf import settings
from apps.procurement.models import PurchaseOrder, AIProcurementSuggestion

class Command(BaseCommand):
    help = 'Runs the Purchase Saga Consumer'

    def handle(self, *args, **options):
        broker_url = getattr(settings, "CELERY_BROKER_URL", "amqp://guest:guest@rabbitmq:5672//")
        self.stdout.write(f"DEBUG: Using broker_url: {broker_url}")
        exchange = Exchange("events", type="topic", durable=True)
        # Bind to relevant events
        queue = Queue("purchase_events_queue", exchange=exchange, routing_key="#")

        self.stdout.write(f"Listening for saga events on {broker_url}...")

        with Connection(broker_url) as conn:
            with Consumer(conn, queues=[queue], callbacks=[self.process_message], accept=['json']):
                while True:
                    conn.drain_events()

    def process_message(self, body, message):
        try:
            # Ensure data is parsed if it's a string (e.g., if content_type wasn't handled)
            data = body
            if isinstance(data, str):
                try:
                    data = json.loads(data)
                except json.JSONDecodeError:
                    self.stdout.write(self.style.ERROR(f"Failed to decode JSON body: {data}"))
                    message.ack()
                    return

            routing_key = message.delivery_info.get('routing_key')
            self.stdout.write(f"Received message with routing_key: {routing_key}")
            
            # 1. Handle Intelligence Suggestions
            if routing_key == "intelligence.inventory.low_stock_predicted":
                self.stdout.write(f"Handling AI Suggestion: {data}")
                self.handle_ai_suggestion(data)
                message.ack()
                return

            # 2. Handle Saga Updates
            if routing_key in ["stock.update.success", "stock.update.failed"]:
                self.handle_saga_update(data, routing_key)
                message.ack()
                return

            message.ack() # Ack other events we don't care about

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error processing message: {e}"))
            message.ack()

    def handle_ai_suggestion(self, data):
        try:
            product_uuid = data.get('product_uuid')
            suggested_qty = data.get('suggested_qty')
            company_uuid = data.get('company_uuid')
            
            if not product_uuid or not suggested_qty or not company_uuid:
                return

            AIProcurementSuggestion.objects.create(
                company_uuid=company_uuid,
                product_uuid=product_uuid,
                suggested_quantity=suggested_qty,
                estimated_out_of_stock_date=data.get('estimated_out_of_stock_date'),
                confidence_score=data.get('confidence_score', 0.8),
                reasoning=data.get('reasoning', 'AI Predicted stockout based on sales velocity.')
            )
            self.stdout.write(self.style.SUCCESS(f"AI Suggestion Created for {product_uuid}"))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Failed to save AI suggestion: {e}"))

    def handle_saga_update(self, data, routing_key):
        order_reference = data.get("order_reference")
        if not order_reference:
            return

        try:
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

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error processing saga: {e}"))
            message.ack()
