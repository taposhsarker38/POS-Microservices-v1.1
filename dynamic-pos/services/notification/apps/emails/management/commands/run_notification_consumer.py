import json
from django.core.management.base import BaseCommand
from django.conf import settings
from django.core.mail import send_mail
from kombu import Connection, Exchange, Queue
from apps.emails.models import EmailTemplate, NotificationLog

class Command(BaseCommand):
    help = 'Runs the notification consumer to send emails based on events'

    def handle(self, *args, **options):
        broker_url = getattr(settings, "CELERY_BROKER_URL", "amqp://guest:guest@rabbitmq:5672/")
        exchange = Exchange("events", type="fanout", durable=False)
        queue = Queue("notification_queue", exchange=exchange, routing_key="#")

        self.stdout.write(self.style.SUCCESS(f"Starting Notification Consumer on {broker_url}"))
        
        with Connection(broker_url) as conn:
            with conn.Consumer(queue, callbacks=[self.process_message]) as consumer:
                while True:
                    conn.drain_events()

    def process_message(self, body, message):
        try:
            event_type = body.get('type')
            self.stdout.write(f"Received event: {event_type}")

            if event_type == 'user.registered':
                self.handle_user_registered(body)
            # Add other handlers here

            message.ack()
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"Error processing message: {e}"))
            message.ack() # Ack anyway to avoid loops for now

    def handle_user_registered(self, data):
        email = data.get('email')
        if not email:
            return

        try:
            # Try to get dynamic template
            template = EmailTemplate.objects.get(code='user.registered')
            subject = template.subject
            body = template.body.format(**data) # Safe format map
        except EmailTemplate.DoesNotExist:
            # Fallback
            subject = "Welcome to POS System"
            body = f"Hello {data.get('username')}, welcome to our platform!"
        except Exception as e:
            # Fallback on format error
            subject = "Welcome to POS System"
            body = f"Hello {data.get('username')}, welcome!"

        try:
            send_mail(
                subject,
                body,
                settings.DEFAULT_FROM_EMAIL,
                [email],
                fail_silently=False,
            )
            
            NotificationLog.objects.create(
                recipient=email,
                subject=subject,
                content=body,
                status='sent'
            )
            self.stdout.write(self.style.SUCCESS(f"Sent Welcome Email to {email}"))
            
        except Exception as e:
            NotificationLog.objects.create(
                recipient=email,
                subject=subject,
                content=body,
                status='failed',
                error_message=str(e)
            )
            self.stdout.write(self.style.ERROR(f"Failed to send email to {email}: {e}"))
