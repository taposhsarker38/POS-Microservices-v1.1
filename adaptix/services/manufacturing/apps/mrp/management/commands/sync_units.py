from django.core.management.base import BaseCommand
from apps.mrp.models import ProductionOrder, ProductUnit
from apps.mrp.utils.serial_generator import generate_serial_number
import json

class Command(BaseCommand):
    help = 'Generate individual ProductUnit records for existing confirmed/in-progress orders'

    def handle(self, *args, **options):
        # Targeting orders that should have units but might not
        orders = ProductionOrder.objects.filter(
            status__in=['CONFIRMED', 'IN_PROGRESS', 'QUALITY_CHECK', 'COMPLETED']
        )
        
        total_created = 0
        self.stdout.write(f"Checking {orders.count()} orders for missing units...")

        for order in orders:
            if order.units.exists():
                self.stdout.write(self.style.WARNING(f"Order PO-{order.id} already has units. Skipping."))
                continue

            count = int(order.quantity_planned)
            self.stdout.write(f"Generating {count} units for Order PO-{order.id}...")
            
            for _ in range(count):
                serial = generate_serial_number()
                ProductUnit.objects.create(
                    serial_number=serial,
                    production_order=order,
                    product_uuid=order.product_uuid,
                    company_uuid=order.company_uuid,
                    status='PRODUCTION' if order.status != 'COMPLETED' else 'INVENTORY',
                    qr_code_data=json.dumps({
                        "serial": serial,
                        "product": str(order.product_uuid),
                        "order": f"PO-{order.id}"
                    })
                )
                total_created += 1

        self.stdout.write(self.style.SUCCESS(f"Successfully generated {total_created} individual units."))
