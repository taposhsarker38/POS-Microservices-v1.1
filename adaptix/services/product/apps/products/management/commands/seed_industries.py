from django.core.management.base import BaseCommand
from apps.products.models import AttributeSet, Attribute
import uuid

class Command(BaseCommand):
    help = 'Seeds standard industry attribute sets (Fashion, Electronics, Pharmacy)'

    def add_arguments(self, parser):
        parser.add_argument('--company', type=str, help='Company UUID to seed for', required=True)

    def handle(self, *args, **options):
        company_uuid = options['company']
        
        # 1. Fashion Set
        fashion_set, _ = AttributeSet.objects.get_or_create(
            name="Fashion & Apparel",
            company_uuid=company_uuid
        )
        self.create_attr(fashion_set, "Size", "size", "select", ["S", "M", "L", "XL", "XXL"], company_uuid)
        self.create_attr(fashion_set, "Color", "color", "text", [], company_uuid)
        self.create_attr(fashion_set, "Fabric", "fabric", "text", [], company_uuid)
        self.create_attr(fashion_set, "Gender", "gender", "select", ["Men", "Women", "Kids", "Unisex"], company_uuid)

        # 2. Pharmacy Set
        pharma_set, _ = AttributeSet.objects.get_or_create(
            name="Pharmacy & Medicine",
            company_uuid=company_uuid
        )
        self.create_attr(pharma_set, "Expiry Date", "expiry_date", "date", [], company_uuid)
        self.create_attr(pharma_set, "Generic Name", "generic_name", "text", [], company_uuid)
        self.create_attr(pharma_set, "Dosage (mg)", "dosage", "number", [], company_uuid)
        self.create_attr(pharma_set, "Side Effects", "side_effects", "text", [], company_uuid)

        # 3. Electronics Set
        elec_set, _ = AttributeSet.objects.get_or_create(
            name="Electronics & Gadgets",
            company_uuid=company_uuid
        )
        self.create_attr(elec_set, "Model Number", "model_number", "text", [], company_uuid)
        self.create_attr(elec_set, "Warranty (Months)", "warranty", "number", [], company_uuid)
        self.create_attr(elec_set, "Power Consumption", "power", "text", [], company_uuid)

        self.stdout.write(self.style.SUCCESS(f"Successfully seeded industries for company {company_uuid}"))

    def create_attr(self, attr_set, name, code, type, options, company_uuid):
        Attribute.objects.get_or_create(
            attribute_set=attr_set,
            code=code,
            company_uuid=company_uuid,
            defaults={
                'name': name,
                'type': type,
                'options': options,
                'is_required': False
            }
        )
