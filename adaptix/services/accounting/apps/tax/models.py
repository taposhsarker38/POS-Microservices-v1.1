import uuid
from django.db import models

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
