from django.core.management.base import BaseCommand
from kombu import Connection, Exchange, Queue, Consumer
import json
import os
from django.conf import settings
from apps.loyalty.models import LoyaltyAccount, LoyaltyTransaction, LoyaltyProgram
from apps.profiles.models import Customer
from django.db import transaction
from decimal import Decimal

class Command(BaseCommand):
    help = 'Runs the Loyalty Event Consumer'

    def handle(self, *args, **options):
        rabbitmq_url = os.environ.get('RABBITMQ_URL', 'amqp://guest:guest@rabbitmq:5672/')
        self.stdout.write(f"Connecting to {rabbitmq_url}...")
        
        exchange = Exchange("events", type="topic", durable=True)
        queue = Queue("loyalty_updates", exchange=exchange, routing_key="pos.sale.closed")

        with Connection(rabbitmq_url) as conn:
            self.stdout.write("Connected to RabbitMQ. Waiting for events...")
            
            with Consumer(conn, queues=queue, callbacks=[self.process_message]):
                while True:
                    conn.drain_events()

    def process_message(self, body, message):
        try:
            data = json.loads(body)
            event_type = data.get('event')
            
            if event_type == "pos.sale.closed":
                self.handle_sale_closed(data)
            
            message.ack()
        except Exception as e:
            self.stderr.write(f"Error processing message: {e}")
            # message.reject(requeue=False) # Or requeue=True depending on policy

    def handle_sale_closed(self, data):
        customer_uuid = data.get('customer_uuid')
        grand_total = data.get('grand_total')
        order_id = data.get('order_id')
        company_uuid = data.get('company_uuid') or data.get('tenant_id')
        
        if not customer_uuid or not grand_total:
            return

        self.stdout.write(f"Processing sale for Customer {customer_uuid}. Total: {grand_total}")

        try:
            # Fetch Active Loyalty Program for the Company
            program = None
            if company_uuid:
                # ONLY fetch 'customer' programs for POS sales events
                program = LoyaltyProgram.objects.filter(company_uuid=company_uuid, is_active=True, target_audience='customer').first()
            
            # If no program found or logic requires default, handle here. 
            # Impl Plan says: Service Control (Toggle on/off). 
            # If no active program is found, we assume the service is OFF for this tenant.
            if not program:
                self.stdout.write(f"No active loyalty program found for company {company_uuid}. Skipping.")
                return

            # Logic: Use Program Earn Rate
            # earn_rate = Points per currency unit. e.g. 0.1 means 1 point per $10.
            # wait, 0.1 * 10 = 1. So earn_rate is points/currency? 
            # Model says: "0.1 = 1 point per $10" -> This means 10 * 0.1 = 1. YES.
            
            points = int(float(grand_total) * float(program.earn_rate))
            
            if points > 0:
                with transaction.atomic():
                    # Find Customer
                    try:
                        customer = Customer.objects.get(id=customer_uuid)
                    except Customer.DoesNotExist:
                        self.stderr.write(f"Customer {customer_uuid} not found")
                        return

                    # Get/Create Loyalty Account
                    account, created = LoyaltyAccount.objects.get_or_create(customer=customer)
                    
                    # Link program if not set
                    if not account.program:
                        account.program = program
                        account.save(update_fields=['program'])
                    
                    # Prevent duplicate processing for same order (Idempotency)
                    if LoyaltyTransaction.objects.filter(reference_id=order_id, transaction_type='earn').exists():
                        self.stdout.write(f"Order {order_id} already processed.")
                        return

                    # Update Balance
                    account.balance += points
                    account.lifetime_points += points
                    # Check for tier update
                    if account.current_tier and account.lifetime_points >= account.current_tier.min_points:
                         pass # sophisticated logic would handle upgrades here using generic tier logic
                         # For now leaving as is, relying on customer.calculate_tier() which uses hardcoded values 
                         # (user should probably refactor that next, but out of scope for "toggle on/off")

                    account.save()
                    
                    # Create Transaction Log
                    LoyaltyTransaction.objects.create(
                        account=account,
                        transaction_type='earn',
                        points=points,
                        description=f'Points earned from Order {data.get("order_number")}',
                        reference_id=order_id,
                        created_by='system'
                    )
                    
                    # Sync to Customer Profile
                    customer.loyalty_points = Decimal(account.balance)
                    customer.calculate_tier() # Alert: This uses hardcoded values in Customer model!
                    customer.save()
                    
                    self.stdout.write(f"Awarded {points} points to {customer.name} (Rate: {program.earn_rate}).")

        except Exception as e:
            self.stderr.write(f"Failed to award points: {e}")
