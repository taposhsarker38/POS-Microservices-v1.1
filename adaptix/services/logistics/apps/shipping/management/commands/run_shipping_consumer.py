import json
import os
import pika
import requests
from django.core.management.base import BaseCommand
from apps.shipping.models import Shipment

class Command(BaseCommand):
    help = 'Runs the Logistics Service consumer to listen for production outputs'

    def handle(self, *args, **options):
        rabbitmq_url = os.environ.get('RABBITMQ_URL', 'amqp://guest:guest@rabbitmq:5672/')
        parameters = pika.URLParameters(rabbitmq_url)
        connection = pika.BlockingConnection(parameters)
        channel = connection.channel()

        channel.exchange_declare(exchange='events', exchange_type='topic', durable=True)
        
        queue_name = 'logistics_inbound'
        channel.queue_declare(queue=queue_name, durable=True)
        channel.queue_bind(exchange='events', queue=queue_name, routing_key='production.output_created')
        channel.queue_bind(exchange='events', queue=queue_name, routing_key='pos.sale.closed')

        def callback(ch, method, properties, body):
            try:
                data = json.loads(body)
                event_type = data.get('event')
                print(f"Logistics received: {event_type}")

                if event_type == 'production.output_created':
                    self.handle_production_output(data)
                elif event_type == 'pos.sale.closed':
                    self.handle_pos_sale(data)
                
                ch.basic_ack(delivery_tag=method.delivery_tag)
            except Exception as e:
                print(f"Error in Logistics consumer: {e}")
                ch.basic_ack(delivery_tag=method.delivery_tag)

        channel.basic_qos(prefetch_count=1)
        channel.basic_consume(queue=queue_name, on_message_callback=callback)

        print(' [*] Logistics is listening for Production and Sales events...')
        channel.start_consuming()

    def handle_production_output(self, data):
        source_order_uuid = data.get('source_order_uuid')
        if not source_order_uuid:
            return

        print(f"Production finished for linked Sales Order {source_order_uuid}. Creating Shipment...")
        self._create_or_update_shipment(source_order_uuid, data)

    def handle_pos_sale(self, data):
        order_uuid = data.get('order_id')
        if not order_uuid:
            return
        
        print(f"POS Sale Closed for Order {order_uuid}. Creating Shipment...")
        self._create_or_update_shipment(order_uuid, data)

    def _create_or_update_shipment(self, order_uuid, event_data):
        # Check if shipment already exists
        if Shipment.objects.filter(order_uuid=order_uuid).exists():
            print(f"Shipment already exists for Order {order_uuid}")
            return

        company_uuid = event_data.get('company_uuid')
        branch_id = event_data.get('wing_uuid')
        
        # Try to fetch additional details if available
        customer_name = event_data.get('customer_name', 'Walk-in Customer')
        customer_phone = event_data.get('customer_phone', '')
        
        # If it's a POS sale, it might have refined details
        if event_data.get('event') == 'pos.sale.closed':
            # POS event has specific structure
            pass

        Shipment.objects.create(
            order_uuid=order_uuid,
            company_uuid=company_uuid,
            branch_id=branch_id,
            customer_name=customer_name,
            customer_phone=customer_phone,
            destination_address=event_data.get('destination_address', 'Check Order Details'),
            status='PENDING'
        )
        print(f"Shipment created for Order {order_uuid}")
