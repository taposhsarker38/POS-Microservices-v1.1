import json
import os
from decimal import Decimal
from django.utils import timezone
from django.core.management.base import BaseCommand
from django.conf import settings
from kombu import Connection, Exchange, Queue
from apps.analytics.models import DailySales, TopProduct, Transaction

class Command(BaseCommand):
    help = 'Runs the reporting consumer to aggregate data based on events'

    def handle(self, *args, **options):
        # Use RABBITMQ_URL from env, which is set in docker-compose
        broker_url = getattr(settings, "CELERY_BROKER_URL", os.environ.get("RABBITMQ_URL", "amqp://adaptix:adaptix123@rabbitmq:5672/"))
        exchange = Exchange("events", type="topic", durable=True)
        queue = Queue("reporting_queue", exchange=exchange, routing_key="#")

        self.stdout.write(self.style.SUCCESS(f"Starting Reporting Consumer on {broker_url}"))
        
        with Connection(broker_url) as conn:
            with conn.Consumer(queue, callbacks=[self.process_message]) as consumer:
                while True:
                    conn.drain_events()

    def process_message(self, body, message):
        try:
            if isinstance(body, (bytes, str)):
                body = json.loads(body)

            # POS publishes 'event', logic expected 'type'
            event_type = body.get('event') or body.get('type')
            
            # Log raw transaction
            # Support both structure for future proofing
            Transaction.objects.create(event_type=event_type, data=body, company_uuid=body.get('company_uuid'))

            if event_type == 'pos.sale.closed' or event_type == 'sale.created':
                self.handle_sale_created(body)
            
            message.ack()
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error processing message: {e}"))
            message.ack()

    def handle_sale_created(self, data):
        try:
            total_amount = Decimal(str(data.get('grand_total') or data.get('total_amount', '0.00')))
            items = data.get('items', [])
            company_uuid = data.get('company_uuid')
            wing_uuid = data.get('wing_uuid')
            
            if not company_uuid:
                 self.stdout.write(self.style.WARNING(f"Skipping sale without company_uuid"))
                 return

            # Update DailySales
            today = timezone.now().date()
            # Ensure we filter by company and wing
            daily_sales, created = DailySales.objects.get_or_create(
                date=today, 
                company_uuid=company_uuid,
                wing_uuid=wing_uuid
            )
            # Fix default float vs Decimal mismatch
            daily_sales.total_revenue = Decimal(str(daily_sales.total_revenue)) + total_amount
            daily_sales.total_transactions += 1
            daily_sales.save()
            
            # Update TopProducts
            for item in items:
                product_name = item.get('product_name') # Needed in event payload
                if not product_name:
                    continue 
                
                # Use float then int to handle strings like '2.000'
                quantity = int(float(item.get('quantity', 1)))
                
                top_product, created = TopProduct.objects.get_or_create(
                    product_name=product_name, 
                    company_uuid=company_uuid,
                    wing_uuid=wing_uuid
                )
                top_product.total_sold += quantity
                top_product.save()

            self.stdout.write(self.style.SUCCESS(f"Processed sale: +{total_amount}"))
            
        except Exception as e:
             self.stdout.write(self.style.ERROR(f"Failed to aggregate sale: {e}"))
