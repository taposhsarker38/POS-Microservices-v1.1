from django.db import models
from apps.utils.models import SoftDeleteModel

class Vendor(SoftDeleteModel):
    name = models.CharField(max_length=255)
    email = models.EmailField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    contact_person = models.CharField(max_length=255, blank=True, null=True)

    class Meta:
        unique_together = ('company_uuid', 'name')

    def __str__(self):
        return self.name
