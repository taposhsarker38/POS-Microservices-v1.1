from django.core.management.base import BaseCommand
from apps.tenants.consumer import start_company_consumer

class Command(BaseCommand):
    help = "Run RabbitMQ consumer for company events"

    def handle(self, *args, **kwargs):
        self.stdout.write(self.style.SUCCESS("🚀 Starting Company-Service consumer..."))
        start_company_consumer()
