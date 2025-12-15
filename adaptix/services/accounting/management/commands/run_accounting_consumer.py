
import json
import os
import pika
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.ledger.models import JournalEntry, JournalItem, ChartOfAccount
from django.db import transaction

class Command(BaseCommand):
    help = 'Runs the RabbitMQ consumer for Accounting Service (Zero-Touch Automation)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("Starting Accounting Consumer..."))

        amqp_url = os.environ.get("CELERY_BROKER_URL", "amqp://guest:guest@rabbitmq:5672/")
        parameters = pika.URLParameters(amqp_url)
        connection = pika.BlockingConnection(parameters)
        channel = connection.channel()

        exchange_name = "events"
        queue_name = "accounting_queue"
        
        # Declare topic exchange
        channel.exchange_declare(exchange=exchange_name, exchange_type='topic', durable=True)
        
        # Declare queue and bind to routing key (pos.*)
        channel.queue_declare(queue=queue_name, durable=True)
        channel.queue_bind(exchange=exchange_name, queue=queue_name, routing_key="pos.*")

        channel.basic_qos(prefetch_count=1)
        channel.basic_consume(queue=queue_name, on_message_callback=self.process_message)

        self.stdout.write(self.style.SUCCESS(' [*] Waiting for Accounting messages.'))
        channel.start_consuming()

    def process_message(self, ch, method, properties, body):
        try:
            payload = json.loads(body)
            event_type = payload.get("event")
            
            if event_type == "pos.sale.closed":
                self.handle_pos_sale(payload)
                self.stdout.write(self.style.SUCCESS(f"Processed sale: {payload.get('order_number')}"))

            ch.basic_ack(delivery_tag=method.delivery_tag)

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error processing message: {e}"))
            # Nack if error is potentially recoverable, or ack and log if malformed
            # For now, ack to prevent loop
            ch.basic_ack(delivery_tag=method.delivery_tag)

    def handle_pos_sale(self, payload):
        company_uuid = payload.get("company_uuid")
        grand_total = float(payload.get("grand_total", 0))
        order_number = payload.get("order_number")
        
        with transaction.atomic():
            # Create Header
            entry = JournalEntry.objects.create(
                company_uuid=company_uuid,
                reference_number=order_number,
                description=f"Auto-generated entry for Sale {order_number}",
                date=payload.get("created_at")[:10], # YYYY-MM-DD
                is_posted=True
            )
            
            # Simple Logic: 
            # Dr. Cash/Bank
            # Cr. Sales Revenue
            
            # Find default accounts (or create generic ones if missing for now)
            sales_account, _ = ChartOfAccount.objects.get_or_create(
                company_uuid=company_uuid,
                code="4000",
                defaults={"name": "Sales Revenue", "group_type": "income"}
            )
            
            cash_account, _ = ChartOfAccount.objects.get_or_create(
                company_uuid=company_uuid,
                code="1000",
                defaults={"name": "Cash on Hand", "group_type": "asset"}
            )
            
            # Debit Cash
            JournalItem.objects.create(
                entry=entry,
                company_uuid=company_uuid,
                account=cash_account,
                debit=grand_total,
                credit=0,
                description="Cash received"
            )
            
            # Credit Sales
            JournalItem.objects.create(
                entry=entry,
                company_uuid=company_uuid,
                account=sales_account,
                debit=0,
                credit=grand_total,
                description="Revenue recognized"
            )
