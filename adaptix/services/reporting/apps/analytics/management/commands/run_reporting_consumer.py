import json
from decimal import Decimal
from django.utils import timezone
from django.core.management.base import BaseCommand
from django.conf import settings
from kombu import Connection, Exchange, Queue
from apps.analytics.models import DailySales, TopProduct, Transaction

class Command(BaseCommand):
    help = 'Runs the reporting consumer to aggregate data based on events'

    def handle(self, *args, **options):
        broker_url = getattr(settings, "CELERY_BROKER_URL", "amqp://guest:guest@rabbitmq:5672/")
        exchange = Exchange("events", type="fanout", durable=False)
        queue = Queue("reporting_queue", exchange=exchange, routing_key="#")

        self.stdout.write(self.style.SUCCESS(f"Starting Reporting Consumer on {broker_url}"))
        
        with Connection(broker_url) as conn:
            with conn.Consumer(queue, callbacks=[self.process_message]) as consumer:
                while True:
                    conn.drain_events()

    def process_message(self, body, message):
        try:
            event_type = body.get('type')
            
            # Log raw transaction
            Transaction.objects.create(event_type=event_type, data=body)

            if event_type == 'sale.created':
                self.handle_sale_created(body)
            # Add other handlers (e.g. purchase.completed for expenses)

            message.ack()
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error processing message: {e}"))
            message.ack()

    def handle_sale_created(self, data):
        try:
            total_amount = Decimal(str(data.get('total_amount', '0.00')))
            items = data.get('items', [])
            
            # Update DailySales
            today = timezone.now().date()
            daily_sales, created = DailySales.objects.get_or_create(date=today)
            daily_sales.total_revenue += total_amount
            daily_sales.total_transactions += 1
            daily_sales.save()
            
            # Update TopProducts
            for item in items:
                product_name = item.get('product_name') # Needed in event payload
                if not product_name:
                    continue # Should fetch from product service if missing, but assume event has it for now
                
                quantity = int(item.get('quantity', 1))
                
                top_product, created = TopProduct.objects.get_or_create(product_name=product_name)
                top_product.total_sold += quantity
                top_product.save()

            self.stdout.write(self.style.SUCCESS(f"Processed sale: +{total_amount}"))
            
        except Exception as e:
             self.stdout.write(self.style.ERROR(f"Failed to aggregate sale: {e}"))
