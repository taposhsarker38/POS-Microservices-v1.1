import json
import pika
from django.conf import settings
from .services import CompanySyncService

def start_rabbitmq_consumer():
    connection = pika.BlockingConnection(
        pika.ConnectionParameters(host=settings.RABBITMQ_HOST)
    )
    channel = connection.channel()

    channel.queue_declare(queue='auth_events', durable=True)

    def callback(ch, method, properties, body):
        payload = json.loads(body)
        event = payload.get("event")

        if event == "company.created":
            CompanySyncService.sync_company_created(payload["data"])

        elif event == "company.updated":
            CompanySyncService.sync_company_updated(payload["data"])

        elif event == "user.created":
            CompanySyncService.sync_user_created(payload["data"])

        elif event == "user.updated":
            CompanySyncService.sync_user_updated(payload["data"])

        ch.basic_ack(delivery_tag=method.delivery_tag)

    channel.basic_consume(queue='auth_events', on_message_callback=callback)
    print(" [*] Waiting for events from auth-service")
    channel.start_consuming()
