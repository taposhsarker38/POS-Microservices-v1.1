
import json
import os
import pika
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.conf import settings
from apps.ledger.models import JournalEntry, JournalItem, ChartOfAccount, AccountGroup
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
        channel.queue_bind(exchange=exchange_name, queue=queue_name, routing_key="asset.*")

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
            
            elif event_type == "asset.depreciation":
                self.handle_asset_depreciation(payload)
                self.stdout.write(self.style.SUCCESS(f"Processed depreciation: {payload.get('asset_name')}"))

            ch.basic_ack(delivery_tag=method.delivery_tag)

        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error processing message: {e}"))
            # Nack if error is potentially recoverable, or ack and log if malformed
            # For now, ack to prevent loop
            ch.basic_ack(delivery_tag=method.delivery_tag)

    def handle_pos_sale(self, payload):
        company_uuid = payload.get("company_uuid")
        grand_total = Decimal(payload.get("grand_total", 0))
        order_number = payload.get("order_number")
        
        with transaction.atomic():
            # Create Header
            entry = JournalEntry.objects.create(
                company_uuid=company_uuid,
                wing_uuid=payload.get("wing_uuid"),
                reference=order_number,
                description=f"Auto-generated entry for Sale {order_number}",
                date=payload.get("created_at")[:10], # YYYY-MM-DD
                is_posted=True,
                total_debit=grand_total,
                total_credit=grand_total
            )
            
            # Simple Logic: 
            # Dr. Cash/Bank
            # Cr. Sales Revenue
            
            # Find or create Groups first
            income_group, _ = AccountGroup.objects.get_or_create(
                company_uuid=company_uuid,
                group_type="income",
                name="Revenue",
                defaults={"code": "40"}
            )
            
            asset_group, _ = AccountGroup.objects.get_or_create(
                company_uuid=company_uuid,
                group_type="asset",
                name="Current Assets",
                defaults={"code": "10"}
            )

            # Find default accounts
            sales_account, _ = ChartOfAccount.objects.get_or_create(
                company_uuid=company_uuid,
                code="4000",
                defaults={"name": "Sales Revenue", "group": income_group}
            )
            
            cash_account, _ = ChartOfAccount.objects.get_or_create(
                company_uuid=company_uuid,
                code="1000",
                defaults={"name": "Cash on Hand", "group": asset_group}
            )
            
            # Debit Cash
            JournalItem.objects.create(
                entry=entry,
                account=cash_account,
                debit=grand_total,
                credit=0,
                description="Cash received"
            )
            
            # Credit Sales
            JournalItem.objects.create(
                entry=entry,
                account=sales_account,
                debit=0,
                credit=grand_total,
                description="Revenue recognized"
            )

    def handle_asset_depreciation(self, payload):
        company_uuid = payload.get("company_uuid")
        amount = Decimal(payload.get("amount", 0))
        asset_name = payload.get("asset_name")
        date = payload.get("date")
        
        with transaction.atomic():
            # Create Header
            entry = JournalEntry.objects.create(
                company_uuid=company_uuid,
                wing_uuid=payload.get("wing_uuid"),
                reference=f"DEP-{payload.get('schedule_id')}",
                description=f"Depreciation for {asset_name}",
                date=date,
                is_posted=True,
                total_debit=amount,
                total_credit=amount
            )
            
            # Find or create Groups
            expense_group, _ = AccountGroup.objects.get_or_create(
                company_uuid=company_uuid,
                group_type="expense",
                name="Operating Expenses",
                defaults={"code": "60"}
            )
            
            asset_group, _ = AccountGroup.objects.get_or_create(
                company_uuid=company_uuid,
                group_type="asset",
                name="Fixed Assets",
                defaults={"code": "15"}
            )
            
            expense_account, _ = ChartOfAccount.objects.get_or_create(
                company_uuid=company_uuid,
                code="6000",
                defaults={"name": "Depreciation Expense", "group": expense_group}
            )
            
            accumulated_account, _ = ChartOfAccount.objects.get_or_create(
                company_uuid=company_uuid,
                code="1500",
                defaults={"name": "Accumulated Depreciation", "group": asset_group}
            )
            
            # Debit Expense
            JournalItem.objects.create(
                entry=entry,
                account=expense_account,
                debit=amount,
                credit=0,
                description=f"Expense for {asset_name}"
            )
            
            # Credit Accumulated Depreciation
            JournalItem.objects.create(
                entry=entry,
                account=accumulated_account,
                debit=0,
                credit=amount,
                description=f"Accumulated Dep. for {asset_name}"
            )
