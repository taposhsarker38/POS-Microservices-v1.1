import uuid
from django.db import models

class DailySales(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    date = models.DateField(unique=True)
    total_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    total_transactions = models.IntegerField(default=0)
    
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.date}: {self.total_revenue}"

class TopProduct(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    product_name = models.CharField(max_length=255)
    total_sold = models.IntegerField(default=0)
    
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-total_sold']

    def __str__(self):
        return f"{self.product_name}: {self.total_sold}"

class Transaction(models.Model):
    """Denormalized event log for granular analysis"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    event_type = models.CharField(max_length=100)
    data = models.JSONField()
    occurred_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.event_type} at {self.occurred_at}"
