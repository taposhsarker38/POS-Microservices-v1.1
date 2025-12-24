import uuid
from django.db import models

class TaxZone(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_uuid = models.UUIDField(db_index=True)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=50, help_text="e.g. BD, SA, NY")
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.code})"

class Tax(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_uuid = models.UUIDField(db_index=True)
    name = models.CharField(max_length=100)
    rate = models.DecimalField(max_digits=5, decimal_places=2) # Percentage
    
    # Link to accounting ledgers for auto-posting
    account_payable = models.UUIDField(help_text="UUID of Liability Account (Output Tax)", null=True, blank=True)
    account_receivable = models.UUIDField(help_text="UUID of Asset Account (Input Tax)", null=True, blank=True)
    
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.name} ({self.rate}%)"

class TaxRule(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_uuid = models.UUIDField(db_index=True)
    tax_zone = models.ForeignKey(TaxZone, on_delete=models.CASCADE, related_name='rules')
    tax = models.ForeignKey(Tax, on_delete=models.CASCADE)
    
    # Optional filters
    product_category_uuid = models.UUIDField(null=True, blank=True, help_text="Apply only to this category")
    
    priority = models.PositiveIntegerField(default=1, help_text="Higher priority rules override lower ones")
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-priority']

    def __str__(self):
        return f"Rule: {self.tax.name} in {self.tax_zone.name}"
