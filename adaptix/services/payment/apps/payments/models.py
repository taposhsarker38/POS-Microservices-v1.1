import uuid
from django.db import models

class Payment(models.Model):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('failed', 'Failed'),
        ('refunded', 'Refunded'),
    )
    
    METHOD_CHOICES = (
        ('card', 'Credit/Debit Card'),
        ('cash', 'Cash'),
        ('wallet', 'Digital Wallet'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_id = models.UUIDField(help_text="Reference to the Order in POS service")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, default='card')
    
    stripe_charge_id = models.CharField(max_length=100, blank=True, null=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.order_id} - {self.amount} {self.currency} ({self.status})"

class Transaction(models.Model):
    """Immutable audit log of all gateway interactions"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    payment = models.ForeignKey(Payment, on_delete=models.CASCADE, related_name='transactions')
    gateway_response = models.JSONField(default=dict)
    status = models.CharField(max_length=50) # Gateway specific status
    
    timestamp = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.payment.id} - {self.status}"
