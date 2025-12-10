import json
import pika
import time
from django.conf import settings
from .models import Company, Department, Designation, AccountGroup, ChartOfAccount


RABBIT_URL = settings.CELERY_BROKER_URL.replace("redis://", "amqp://")

def handle_company_created(data: dict):
    company_id = data.get("id")
    name = data.get("name")
    code = data.get("code")
    address = data.get("address", "")
    timezone = data.get("timezone", "UTC")

    if not company_id or not name or not code:
        print("❌ Invalid company.created event payload:", data)
        return

    company, created = Company.objects.update_or_create(
        id=company_id,
        defaults={
            "auth_company_uuid": company_id,
            "name": name,
            "code": code,
            "address": address,
            "timezone": timezone,
        },
    )

    if created:
        print(f"✅ Company created: {name}. Seeding defaults...")
        seed_company_defaults(company)
    else:
        print(f"✅ Company updated: {name}")


def seed_company_defaults(company):
    """Creates default HR and Accounting data for a new company."""
    try:
        # 1. Departments
        Department.objects.bulk_create([
            Department(company=company, name="Administration", description="Top level management"),
            Department(company=company, name="Sales", description="Sales team"),
            Department(company=company, name="Staff", description="General staff"),
        ])
        
        # 2. Designations
        Designation.objects.bulk_create([
            Designation(company=company, name="Owner", rank=1),
            Designation(company=company, name="Manager", rank=2),
            Designation(company=company, name="Staff", rank=3),
        ])

        # 3. Account Groups (Basic Setup)
        assets = AccountGroup.objects.create(company=company, name="Assets", group_type="asset", code="1000")
        liabilities = AccountGroup.objects.create(company=company, name="Liabilities", group_type="liability", code="2000")
        equity = AccountGroup.objects.create(company=company, name="Equity", group_type="equity", code="3000")
        income = AccountGroup.objects.create(company=company, name="Income", group_type="income", code="4000")
        expenses = AccountGroup.objects.create(company=company, name="Expenses", group_type="expense", code="5000")

        # 4. Chart of Accounts (Common Ledgers)
        ChartOfAccount.objects.bulk_create([
            ChartOfAccount(company=company, group=assets, name="Cash in Hand", code="1001"),
            ChartOfAccount(company=company, group=assets, name="Bank Account", code="1002"),
            ChartOfAccount(company=company, group=income, name="Sales Revenue", code="4001"),
            ChartOfAccount(company=company, group=expenses, name="Cost of Goods Sold", code="5001"),
            ChartOfAccount(company=company, group=expenses, name="Rent Expense", code="5002"),
            ChartOfAccount(company=company, group=expenses, name="Utilities", code="5003"),
        ])
        print(f"🌱 Seeded defaults for company: {company.name}")
    except Exception as e:
        print(f"❌ Error seeding defaults for {company.name}: {e}")


def start_company_consumer():
    """Start RabbitMQ consumer safely."""

    while True:
        try:
            print(f"🔄 Connecting to RabbitMQ → {RABBIT_URL}")
            connection = pika.BlockingConnection(
                pika.URLParameters(RABBIT_URL)
            )
            channel = connection.channel()

            queue_name = "company.created.queue"
            channel.queue_declare(queue=queue_name, durable=True)

            print("✅ Company-Service consumer connected. Waiting for events...")

            def callback(ch, method, properties, body):
                print("📩 Event Received:", body)
                try:
                    event = json.loads(body.decode())
                    handle_company_created(event)
                except Exception as e:
                    print("❌ Error processing message:", e)

                ch.basic_ack(delivery_tag=method.delivery_tag)

            channel.basic_consume(queue=queue_name, on_message_callback=callback)
            channel.start_consuming()

        except Exception as e:
            print("⚠️ RabbitMQ not ready, retrying in 5 seconds...", e)
            time.sleep(5)
