import json
import os
import pika
from django.core.management.base import BaseCommand
from apps.mrp.models import ProductionOrder

class Command(BaseCommand):
    help = 'Runs the Manufacturing Service consumer to listen for quality updates'

    def handle(self, *args, **options):
        rabbitmq_url = os.environ.get('RABBITMQ_URL', 'amqp://guest:guest@rabbitmq:5672/')
        parameters = pika.URLParameters(rabbitmq_url)
        connection = pika.BlockingConnection(parameters)
        channel = connection.channel()

        channel.exchange_declare(exchange='events', exchange_type='topic', durable=True)
        
        queue_name = 'mrp_updates'
        channel.queue_declare(queue=queue_name, durable=True)
        # Bind to quality events
        channel.queue_bind(exchange='events', queue=queue_name, routing_key='quality.inspection.completed')

        def callback(ch, method, properties, body):
            try:
                data = json.loads(body)
                event_type = data.get('event')
                print(f"Received event: {event_type}")

                if event_type == 'quality.inspection.completed':
                    self.handle_qc_completion(data)
                
                ch.basic_ack(delivery_tag=method.delivery_tag)
            except Exception as e:
                print(f"Error processing message: {e}")
                ch.basic_ack(delivery_tag=method.delivery_tag)

        channel.basic_qos(prefetch_count=1)
        channel.basic_consume(queue=queue_name, on_message_callback=callback)

        print(' [*] Waiting for MRP updates. To exit press CTRL+C')
        channel.start_consuming()

    def handle_qc_completion(self, data):
        ref_uuid = data.get('reference_uuid')
        status = data.get('status')
        # ref_type = data.get('reference_type') # Optional: Check if PRODUCTION

        if not ref_uuid:
            return

        try:
            # Find order by UUID
            order = ProductionOrder.objects.get(uuid=ref_uuid)
            
            if status == 'PASSED':
                order.status = 'COMPLETED'
                order.quantity_produced = order.quantity_planned # Assume full quantity passed for MVP
                order.save()
                print(f"Order {order.id} updated to COMPLETED")
                self.publish_output_event(order)
            elif status == 'FAILED':
                # Move back to In Progress or customized 'FAILED' state?
                # For now, keep in QUALITY_CHECK but log note
                order.notes += f"\n[QC FAILED]: {data.get('notes')}"
                order.save()
                print(f"Order {order.id} QC Failed. Notes updated.")
                
        except ProductionOrder.DoesNotExist:
            print(f"Order with UUID {ref_uuid} not found")

    def publish_output_event(self, order):
        from kombu import Connection, Exchange, Producer
        from django.core.serializers.json import DjangoJSONEncoder
        
        try:
            rabbitmq_url = os.environ.get('RABBITMQ_URL', 'amqp://guest:guest@rabbitmq:5672/')
            connection = pika.BlockingConnection(pika.URLParameters(rabbitmq_url))
            channel = connection.channel()
            
            # Use pika to publish
            exchange_name = 'events'
            
            event_payload = {
                "event": "production.output_created",
                "order_id": str(order.id),
                "order_uuid": str(order.uuid),
                "product_uuid": str(order.product_uuid),
                "quantity": float(order.quantity_produced),
                "company_uuid": str(order.company_uuid),
            }
            
            channel.basic_publish(
                exchange=exchange_name,
                routing_key="production.output_created",
                body=json.dumps(event_payload, cls=DjangoJSONEncoder)
            )
            connection.close()
            print(f"Published production.output_created for Order {order.id}")
        except Exception as e:
            print(f"Failed to publish output event: {e}")
