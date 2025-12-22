import uuid
from django.db import models

class DailySales(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_uuid = models.UUIDField(db_index=True, null=True, blank=True)
    wing_uuid = models.UUIDField(db_index=True, null=True, blank=True)
    
    date = models.DateField()
    total_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_transactions = models.IntegerField(default=0)
    
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('company_uuid', 'wing_uuid', 'date')

    def __str__(self):
        return f"{self.date}: {self.total_revenue} ({self.company_uuid})"

class TopProduct(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_uuid = models.UUIDField(db_index=True, null=True, blank=True)
    wing_uuid = models.UUIDField(db_index=True, null=True, blank=True)
    
    product_name = models.CharField(max_length=255)
    total_sold = models.IntegerField(default=0)
    
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-total_sold']
        unique_together = ('company_uuid', 'wing_uuid', 'product_name')

    def __str__(self):
        return f"{self.product_name}: {self.total_sold}"

class Transaction(models.Model):
    """Denormalized event log for granular analysis"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_uuid = models.UUIDField(db_index=True, null=True, blank=True)
    
    event_type = models.CharField(max_length=100)
    data = models.JSONField()
    occurred_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.event_type} at {self.occurred_at}"

class DailyProduction(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_uuid = models.UUIDField(db_index=True, null=True, blank=True)
    
    date = models.DateField() # Not unique globally anymore
    total_produced = models.IntegerField(default=0)
    total_defects = models.IntegerField(default=0)
    
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ('company_uuid', 'date')

    def __str__(self):
        return f"{self.date}: +{self.total_produced} / -{self.total_defects}"
