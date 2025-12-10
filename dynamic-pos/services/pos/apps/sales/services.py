import requests
from django.conf import settings

class InventoryService:
    BASE_URL = "http://dynamicpos-inventory:8000/api" # Docker service name

    @staticmethod
    def deduct_stock(sale_data, sale_uuid):
        """
        Publish 'stock.update' event (Action: decrease) to RabbitMQ.
        """
        from kombu import Connection, Exchange, Producer
        from django.conf import settings
        
        # Extract items
        # sale_data is expected to be the Validated Data from Serializer or the Sales Model?
        # Based on views.py usage: InventoryService.deduct_stock(serializer.data, uuid)
        
        items = sale_data.get('items', [])
        company_uuid = sale_data.get('company_uuid') # This might modify the serializer to include company_uuid if not present
        
        # If company_uuid is not in items, we need it. 
        # Assuming the view passes enough context or we extract it.
        # Let's assume passed sale_data has 'company_uuid'
        
        broker_url = getattr(settings, "CELERY_BROKER_URL", "amqp://guest:guest@rabbitmq:5672//")
        exchange = Exchange("events", type="fanout", durable=False)

        try:
            with Connection(broker_url) as conn:
                producer = Producer(conn)
                
                for item in items:
                    payload = {
                        "type": "stock.update",
                        "product_uuid": str(item.get('product_uuid')),
                        "variant_uuid": str(item.get('variant_uuid')) if item.get('variant_uuid') else None,
                        "quantity": float(item.get('quantity')),
                        "action": "decrease",
                        "reason": f"Sale #{sale_uuid}",
                        "company_uuid": str(company_uuid)
                    }
                    
                    producer.publish(
                        payload,
                        exchange=exchange,
                        routing_key="stock.update",
                        declare=[exchange],
                        retry=True
                    )
            return True
        except Exception as e:
            print(f"Failed to publish stock deduction event: {e}")
            return False
