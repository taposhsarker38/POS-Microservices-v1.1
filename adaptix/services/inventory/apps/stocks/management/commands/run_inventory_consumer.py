import json
from django.core.management.base import BaseCommand
from kombu import Connection, Exchange, Queue, Consumer
from django.conf import settings
from apps.stocks.models import Stock, StockTransaction, Warehouse

class Command(BaseCommand):
    help = 'Runs the Inventory Event Consumer'

    def handle(self, *args, **options):
        broker_url = getattr(settings, "CELERY_BROKER_URL", "amqp://guest:guest@rabbitmq:5672//")
        exchange = Exchange("events", type="fanout", durable=False)
        # Using a dedicated queue for inventory updates to ensure persistence/load balancing if needed
        # But 'events' is fanout, so we need a unique queue or shared if we want load balancing.
        # Let's use exclusive=False + durable=True queue to ensure we catch messages even if consumer restarts?
        # Fanout broadcasts to ALL bound queues. So we just bind OUR queue.
        queue = Queue("inventory_updates", exchange=exchange, routing_key="stock.update")

        self.stdout.write(f"Listening for inventory events on {broker_url}...")

        with Connection(broker_url) as conn:
            with Consumer(conn, queues=[queue], callbacks=[self.process_message], accept=['json']):
                while True:
                    conn.drain_events()

    def process_message(self, body, message):
        try:
            data = body
            # Expected: {type, product_uuid, quantity, action, company_uuid, ...}
            
            if data.get("type") != "stock.update":
                message.ack()
                return

            product_uuid = data.get("product_uuid")
            company_uuid = data.get("company_uuid")
            quantity = float(data.get("quantity", 0))
            action = data.get("action")
            reason = data.get("reason", "Event Update")

            if not product_uuid or not company_uuid:
                self.stdout.write(self.style.WARNING("Missing UUIDs in event"))
                message.ack()
                return

            # Find Stock (Assuming Warehouse 'Main' or default)
            # In V1, we might need to find ANY warehouse or a specific one.
            # Let's assume a default warehouse exists for the company or create one.
            warehouse, _ = Warehouse.objects.get_or_create(
                company_uuid=company_uuid, 
                name="Main Warehouse",
                defaults={"is_active": True}
            )

            stock, created = Stock.objects.get_or_create(
                company_uuid=company_uuid,
                warehouse=warehouse,
                product_uuid=product_uuid,
                defaults={"quantity": 0, "avg_cost": 0}
            )

            old_qty = stock.quantity
            
            if action == 'increase':
                stock.quantity += quantity
            elif action == 'decrease':
                stock.quantity -= quantity
            
            stock.save()

            # Record Transaction
            StockTransaction.objects.create(
                company_uuid=company_uuid,
                stock=stock,
                type='in' if action == 'increase' else 'out',
                quantity_change=quantity if action == 'increase' else -quantity,
                balance_after=stock.quantity,
                notes=f"Async Event: {reason}",
                created_by="system-worker"
            )

            self.stdout.write(self.style.SUCCESS(f"Updated stock {product_uuid}: {old_qty} -> {stock.quantity}"))
            
            # Publish Success Event
            self.publish_result(broker_url, exchange, "stock.update.success", {
                "product_uuid": product_uuid,
                "company_uuid": company_uuid,
                "order_reference": reason.replace("PO #", "") if "PO #" in reason else None,
                "status": "success"
            })
            
            message.ack()

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error processing event: {e}"))
            
            # Publish Failure Event (if we have enough data)
            try:
                data = json.loads(body) if isinstance(body, str) else body
                self.publish_result(broker_url, exchange, "stock.update.failed", {
                    "product_uuid": data.get("product_uuid"),
                    "company_uuid": data.get("company_uuid"),
                    "order_reference": data.get("reason", "").replace("PO #", "") if "PO #" in data.get("reason", "") else None,
                    "status": "failed",
                    "error": str(e)
                })
            except:
                pass
                
            message.ack()

    def publish_result(self, broker_url, exchange, routing_key, payload):
        from kombu import Connection, Producer
        try:
            with Connection(broker_url) as conn:
                producer = Producer(conn)
                producer.publish(
                    payload,
                    exchange=exchange,
                    routing_key=routing_key,
                    declare=[exchange],
                    retry=True
                )
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Failed to publish result: {e}"))
