import json
import asyncio
from django.core.management.base import BaseCommand
from kombu import Connection, Exchange, Queue, Consumer
from django.conf import settings
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

class Command(BaseCommand):
    help = 'Runs the RabbitMQ -> WebSocket Bridge'

    def handle(self, *args, **options):
        broker_url = settings.CELERY_BROKER_URL
        exchange = Exchange("notifications", type="fanout", durable=True)
        queue = Queue("websocket_bridge_queue", exchange=exchange, routing_key="notify.#")

        self.stdout.write(f"Listening for notifications on {broker_url}...")
        self.channel_layer = get_channel_layer()

        with Connection(broker_url) as conn:
            with Consumer(conn, queues=[queue], callbacks=[self.process_message], accept=['json']):
                while True:
                    conn.drain_events()

    def process_message(self, body, message):
        try:
            # Body: {user_id, message, type, payload...}
            user_id = body.get("user_id")
            if user_id:
                group_name = f"user_{user_id}"
                # Send to Django Channels Group
                async_to_sync(self.channel_layer.group_send)(
                    group_name,
                    {
                        "type": "notify_user", # Calls NotificationConsumer.notify_user
                        "message": body.get("message"),
                        "event_type": body.get("type"),
                        "payload": body.get("payload")
                    }
                )
                self.stdout.write(f"Forwarded notification to {group_name}")
            
            message.ack()
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error bridging notification: {e}"))
            message.ack()
