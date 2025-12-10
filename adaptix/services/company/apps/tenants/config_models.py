from django.db import models
from .models import Company

class BusinessProfile(models.Model):
    """
    Stores specific configuration for vertical-specific features.
    e.g. For 'Doctor', this might store 'consultation_fee'.
    For 'Restaurant', it might store 'service_charge_percent'.
    """
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name='business_profile')
    
    # Generic config dump for the 'Business Brain'
    # e.g. {"consultation_fee": 500, "service_charge": 10}
    config = models.JSONField(default=dict, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Profile for {self.company.name}"
