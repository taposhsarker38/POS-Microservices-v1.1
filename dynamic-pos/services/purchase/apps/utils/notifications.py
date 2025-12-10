import json
from kombu import Connection, Exchange, Producer
from django.conf import settings

class NotificationService:
    def __init__(self):
        self.broker_url = getattr(settings, "CELERY_BROKER_URL", "amqp://guest:guest@rabbitmq:5672//")
        self.exchange_name = "events"
        self.exchange = Exchange(self.exchange_name, type="fanout", durable=False)

    def send_notification(self, event_type, data, rooms=None):
        """
        Send a notification to the WS Gateway.
        :param event_type: String e.g., 'purchase.order.approved'
        :param data: Dict payload
        :param rooms: List of strings e.g., ['company_uuid']
        """
        if rooms is None:
            rooms = []

        payload = {
            "event": event_type,
            "data": data,
            "rooms": rooms
        }

        try:
            with Connection(self.broker_url) as conn:
                producer = Producer(conn)
                producer.publish(
                    payload,
                    exchange=self.exchange,
                    routing_key="", # Fanout doesn't need routing key
                    declare=[self.exchange],
                    retry=True
                )
        except Exception as e:
            print(f"Failed to send notification: {e}")
