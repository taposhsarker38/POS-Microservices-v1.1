import json
from django.core.management.base import BaseCommand
from kombu import Connection, Exchange, Queue, Consumer
from django.conf import settings
from apps.stocks.models import Stock, StockTransaction, Warehouse

class Command(BaseCommand):
    help = 'Runs the Inventory Event Consumer'

    def handle(self, *args, **options):
        import os
        broker_url = os.environ.get("RABBITMQ_URL", "amqp://adaptix:adaptix123@rabbitmq:5672/")

        exchange = Exchange("events", type="topic", durable=True)
        queue = Queue("inventory_updates", exchange=exchange, routing_key="stock.update")
        
        # New Bindings for Manufacturing
        queue_mfg = Queue("inventory_mfg_updates", exchange=exchange, routing_key="production.*") # Catch all production events

        self.stdout.write(f"Listening for inventory events on {broker_url}...")

        with Connection(broker_url) as conn:
            # We listen on BOTH queues
            with Consumer(conn, queues=[queue, queue_mfg], callbacks=[self.process_message], accept=['json']):
                while True:
                    conn.drain_events()

    def process_message(self, body, message):
        try:
            data = body
            event_type = data.get("event") or data.get("type")
            
            if event_type == "production.output_created":
                self.handle_output_created(data)
                message.ack()
                return
            elif event_type == "production.materials_consumed":
                self.handle_materials_consumed(data)
                message.ack()
                return
            elif event_type == "stock.update":
                # Fallthrough to existing logic
                pass
            else:
                # Unknown event
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

    def handle_output_created(self, data):
        # Add Finished Good to Stock
        self.update_stock(
            company_uuid=data.get("company_uuid"),
            product_uuid=data.get("product_uuid"),
            quantity=float(data.get("quantity", 0)),
            action="increase",
            reason=f"Production Output: Order {data.get('order_id')}"
        )

    def handle_materials_consumed(self, data):
        # Deduct Raw Materials from Stock
        # Payload expected: { ..., "items": [{ "component_uuid": "...", "quantity": 10 }, ...] }
        for item in data.get("items", []):
            self.update_stock(
                company_uuid=data.get("company_uuid"),
                product_uuid=item.get("component_uuid"),
                quantity=float(item.get("quantity", 0)),
                action="decrease",
                reason=f"Production Consumption: Order {data.get('order_id')}"
            )

    def update_stock(self, company_uuid, product_uuid, quantity, action, reason):
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

            StockTransaction.objects.create(
                company_uuid=company_uuid,
                stock=stock,
                type='in' if action == 'increase' else 'out',
                quantity_change=quantity if action == 'increase' else -quantity,
                balance_after=stock.quantity,
                notes=reason,
                created_by="system-manufacturing"
            )

            self.stdout.write(self.style.SUCCESS(f"Updated stock {product_uuid}: {old_qty} -> {stock.quantity} ({action})"))
