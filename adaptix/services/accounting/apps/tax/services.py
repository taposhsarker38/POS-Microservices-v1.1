from decimal import Decimal
from .models import TaxRule, TaxZone

class TaxEngine:
    @staticmethod
    def get_applicable_taxes(company_uuid, zone_code, category_uuid=None):
        """
        Finds all active tax rules for a given zone and company, 
        filtered by category if provided.
        """
        try:
            zone = TaxZone.objects.get(company_uuid=company_uuid, code=zone_code, is_active=True)
        except TaxZone.DoesNotExist:
            return []

        # Start with all active rules in this zone
        rules = TaxRule.objects.filter(
            company_uuid=company_uuid, 
            tax_zone=zone, 
            is_active=True
        ).select_related('tax')

        # Filter by category if provided, but also include non-category specific rules (global rules)
        if category_uuid:
            # Rules specific to this category OR global rules (where category is null)
            from django.db.models import Q
            rules = rules.filter(Q(product_category_uuid=category_uuid) | Q(product_category_uuid__isnull=True))
        else:
            # Only global rules
            rules = rules.filter(product_category_uuid__isnull=True)

        # Since rules are ordered by -priority, higher priority ones come first.
        # However, multiple taxes might apply (e.g. VAT + Cess).
        # We'll return all that match.
        return [rule.tax for rule in rules]

    @staticmethod
    def calculate_tax(company_uuid, zone_code, amount, category_uuid=None):
        """
        Calculates total tax for a given amount.
        """
        taxes = TaxEngine.get_applicable_taxes(company_uuid, zone_code, category_uuid)
        total_tax_amount = Decimal('0.00')
        applied_taxes = []

        for tax in taxes:
            # Simple percentage calculation
            tax_amount = (amount * tax.rate) / Decimal('100.00')
            total_tax_amount += tax_amount
            applied_taxes.append({
                'tax_id': str(tax.id),
                'name': tax.name,
                'rate': float(tax.rate),
                'amount': float(tax_amount)
            })

        return {
            'total_tax': float(total_tax_amount),
            'taxes': applied_taxes
        }
