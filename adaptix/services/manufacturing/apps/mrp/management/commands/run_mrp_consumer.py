import json
import os
import pika
from django.core.management.base import BaseCommand
from apps.mrp.models import ProductionOrder, BillOfMaterial

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
        channel.queue_bind(exchange='events', queue=queue_name, routing_key='sales.production_requested')

        def callback(ch, method, properties, body):
            try:
                data = json.loads(body)
                event_type = data.get('event')
                print(f"Received event: {event_type}")

                if event_type == 'quality.inspection.completed':
                    self.handle_qc_completion(data)
                elif event_type == 'sales.production_requested':
                    self.handle_sales_production_request(data)
                
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
                order.quantity_produced = order.quantity_planned 
                order.save()
                print(f"Order {order.id} updated to COMPLETED")
                self.publish_output_event(order)
                
                # Update QC History
                order.qc_history.append({
                    "date": data.get('inspection_date'),
                    "status": "PASSED",
                    "inspector_id": data.get('inspector_id'),
                    "notes": data.get('notes')
                })
                order.save()
                
            elif status == 'REJECTED' or status == 'FAILED':
                # Move to REWORK
                order.status = 'REWORK'
                order.notes += f"\n[QC REJECTED]: Category: {data.get('defect_category_name', 'Unknown')}. Notes: {data.get('notes')}"
                
                # Log to QC History
                order.qc_history.append({
                    "date": data.get('inspection_date'),
                    "status": "REJECTED",
                    "inspector_id": data.get('inspector_id'),
                    "defect_category": data.get('defect_category_name'),
                    "notes": data.get('notes'),
                    "rework_cycle": len([h for h in order.qc_history if h['status'] == 'REJECTED']) + 1
                })
                order.save()
                print(f"Order {order.id} moved to REWORK. History updated.")
                
                # Publish Escalation Event if needed (logic can be added here or in notification service)
                self.publish_escalation_event(order, data)
                
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
                "source_order_uuid": str(order.source_order_uuid) if order.source_order_uuid else None,
                "source_order_number": order.source_order_number,
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

    def handle_sales_production_request(self, data):
        """
        Creates a ProductionOrder automatically when requested by Sales/POS
        """
        product_uuid = data.get('product_uuid')
        quantity = data.get('quantity')
        company_uuid = data.get('company_uuid')
        order_uuid = data.get('order_uuid')
        order_number = data.get('order_number')

        if not product_uuid or not quantity:
            print("Missing product_uuid or quantity in sales.production_requested event")
            return

        try:
            # Try to find a default BOM for this product
            bom = BillOfMaterial.objects.filter(
                product_uuid=product_uuid, 
                company_uuid=company_uuid,
                is_active=True
            ).first()

            if not bom:
                print(f"No active BOM found for product {product_uuid}. Cannot auto-create Production Order.")
                return

            # Create Production Order linked to Sales Order
            order = ProductionOrder.objects.create(
                company_uuid=company_uuid,
                product_uuid=product_uuid,
                bom=bom,
                quantity_planned=quantity,
                status='DRAFT',
                source_order_uuid=order_uuid,
                source_order_number=order_number,
                notes=f"Auto-created from Head Office Order {order_number or ''}"
            )
            print(f"Created linked Production Order {order.id} for Sales Order {order_number}")

        except Exception as e:
            print(f"Error handling sales.production_requested: {e}")

    def publish_escalation_event(self, order, qc_data):
        """
        Publishes an event to trigger management alerts for defects
        """
        try:
            rabbitmq_url = os.environ.get('RABBITMQ_URL', 'amqp://guest:guest@rabbitmq:5672/')
            connection = pika.BlockingConnection(pika.URLParameters(rabbitmq_url))
            channel = connection.channel()
            
            event_payload = {
                "event": "manufacturing.defect_escalation",
                "order_uuid": str(order.id),
                "order_number": f"PO-{order.id}",
                "product_uuid": str(order.product_uuid),
                "defect_category": qc_data.get('defect_category_name'),
                "notes": qc_data.get('notes'),
                "company_uuid": str(order.company_uuid),
            }
            
            channel.basic_publish(
                exchange='events',
                routing_key="manufacturing.defect_escalation",
                body=json.dumps(event_payload)
            )
            connection.close()
            print(f"Published escalation event for PO-{order.id}")
        except Exception as e:
            print(f"Failed to publish escalation event: {e}")
