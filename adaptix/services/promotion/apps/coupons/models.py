import uuid
from django.db import models
from django.utils import timezone

class Coupon(models.Model):
    TYPE_CHOICES = (
        ('percent', 'Percentage'),
        ('fixed', 'Fixed Amount'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=50, unique=True)
    discount_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='percent')
    value = models.DecimalField(max_digits=10, decimal_places=2, help_text="Discount value (e.g. 10 for 10% or $10)")
    min_purchase_amount = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    valid_from = models.DateTimeField(default=timezone.now)
    valid_to = models.DateTimeField(blank=True, null=True)
    active = models.BooleanField(default=True)
    usage_limit = models.IntegerField(default=100)
    times_used = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def is_valid(self):
        now = timezone.now()
        if not self.active:
            return False
        if self.valid_to and now > self.valid_to:
            return False
        if now < self.valid_from:
            return False
        if self.usage_limit > 0 and self.times_used >= self.usage_limit:
            return False
        return True

    def __str__(self):
        return f"{self.code} ({self.get_discount_type_display()}: {self.value})"
