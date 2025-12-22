import json
import os
import pika
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.quality.models import Inspection

class Command(BaseCommand):
    help = 'Runs the Quality Service consumer to listen for inspection requests'

    def handle(self, *args, **options):
        rabbitmq_url = os.environ.get('RABBITMQ_URL', 'amqp://guest:guest@rabbitmq:5672/')
        parameters = pika.URLParameters(rabbitmq_url)
        connection = pika.BlockingConnection(parameters)
        channel = connection.channel()

        channel.exchange_declare(exchange='events', exchange_type='topic', durable=True)
        
        queue_name = 'quality_inspections'
        channel.queue_declare(queue=queue_name, durable=True)
        channel.queue_bind(exchange='events', queue=queue_name, routing_key='production.qc_requested')
        channel.queue_bind(exchange='events', queue=queue_name, routing_key='inventory.qc_requested')

        def callback(ch, method, properties, body):
            try:
                data = json.loads(body)
                event_type = data.get('event')
                print(f"Received event: {event_type}")

                if event_type == 'production.qc_requested':
                    self.create_inspection(data)
                
                ch.basic_ack(delivery_tag=method.delivery_tag)
            except Exception as e:
                print(f"Error processing message: {e}")
                # Ideally, nack or retry. For MVP, we log and ack to avoid blocking.
                ch.basic_ack(delivery_tag=method.delivery_tag)

        channel.basic_qos(prefetch_count=1)
        channel.basic_consume(queue=queue_name, on_message_callback=callback)

        print(' [*] Waiting for quality inspection requests. To exit press CTRL+C')
        channel.start_consuming()

    def create_inspection(self, data):
        ref_uuid = data.get('reference_uuid')
        ref_type = data.get('reference_type', 'PRODUCTION')
        source = data.get('source')
        
        if not ref_uuid:
            print("Skipping inspection creation: Missing reference_uuid")
            return

        exists = Inspection.objects.filter(reference_uuid=ref_uuid, reference_type=ref_type).exists()
        if exists:
            print(f"Inspection already exists for {ref_type} {ref_uuid}")
            return

        Inspection.objects.create(
            reference_uuid=ref_uuid,
            reference_type=ref_type,
            status='PENDING',
            notes=f"Auto-generated from {source} event. Order #{data.get('order_id')}"
        )
        print(f"Created Inspection for {ref_type} {ref_uuid}")
