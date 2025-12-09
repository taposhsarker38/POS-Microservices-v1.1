import json
import pika
import time
from django.conf import settings
from .models import Company


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

    Company.objects.update_or_create(
        id=company_id,
        defaults={
            "auth_company_uuid": company_id,
            "name": name,
            "code": code,
            "address": address,
            "timezone": timezone,
        },
    )

    print(f"✅ company.created synced: {name}")


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
