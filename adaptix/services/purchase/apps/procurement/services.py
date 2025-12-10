import requests
from django.conf import settings

class InventoryService:
    @staticmethod
    def increase_stock(order_item, company_uuid):
        """
        Publish 'stock.update' event to async queue.
        """
        from kombu import Connection, Exchange, Producer
        from django.conf import settings
        
        broker_url = getattr(settings, "CELERY_BROKER_URL", "amqp://guest:guest@rabbitmq:5672//")
        exchange = Exchange("events", type="fanout", durable=False) # Same exchange as NotificationService for simplicity, or separate 'inventory_events'
        
        payload = {
            "type": "stock.update", # Event Type
            "product_uuid": str(order_item.product_uuid),
            "variant_uuid": str(order_item.variant_uuid) if order_item.variant_uuid else None,
            "quantity": float(order_item.quantity),
            "action": "increase",
            "reason": f"PO #{order_item.order.reference_number}",
            "company_uuid": str(company_uuid)
        }
        
        try:
            with Connection(broker_url) as conn:
                producer = Producer(conn)
                producer.publish(
                    payload,
                    exchange=exchange,
                    routing_key="stock.update",
                    declare=[exchange],
                    retry=True
                )
            return True
        except Exception as e:
            print(f"Failed to publish stock update event: {e}")
            return False
