from django.db import models
from apps.profiles.models import Customer
import uuid

class LoyaltyProgram(models.Model):
    AUDIENCE_CHOICES = (
        ('customer', 'Customer'),
        ('employee', 'Employee'),
    )
    name = models.CharField(max_length=255, default="Standard Loyalty")
    earn_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.1, help_text="Points earned per currency unit (e.g. 0.1 = 1 point per $10)")
    redemption_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.01, help_text="Currency value per point (e.g. 0.01 = 1 cent per point)")
    is_active = models.BooleanField(default=True)
    target_audience = models.CharField(max_length=20, choices=AUDIENCE_CHOICES, default='customer')
    company_uuid = models.UUIDField(db_index=True)

    def __str__(self):
        return f"{self.name} ({self.target_audience}) - {self.company_uuid}"

class LoyaltyTier(models.Model):
    name = models.CharField(max_length=50) # Bronze, Silver, Gold
    min_points = models.IntegerField(help_text="Lifetime points required to reach this tier")
    multiplier = models.DecimalField(max_digits=4, decimal_places=2, default=1.0, help_text="Point earning multiplier")
    program = models.ForeignKey(LoyaltyProgram, on_delete=models.CASCADE, related_name='tiers')
    
    class Meta:
        ordering = ['min_points']

    def __str__(self):
        return f"{self.name} (> {self.min_points} pts)"

class LoyaltyAccount(models.Model):
    customer = models.OneToOneField(Customer, on_delete=models.CASCADE, related_name='loyalty_account', null=True, blank=True)
    employee_uuid = models.UUIDField(null=True, blank=True, db_index=True, help_text="Reference to Employee in HRMS")
    program = models.ForeignKey(LoyaltyProgram, on_delete=models.SET_NULL, null=True)
    balance = models.IntegerField(default=0)
    lifetime_points = models.IntegerField(default=0)
    current_tier = models.ForeignKey(LoyaltyTier, on_delete=models.SET_NULL, null=True, blank=True)
    
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        owner = self.customer if self.customer else f"Emp:{self.employee_uuid}"
        return f"{owner} - {self.balance} pts"

class LoyaltyTransaction(models.Model):
    TYPE_CHOICES = (
        ('earn', 'Earned'),
        ('redeem', 'Redeemed'),
        ('expire', 'Expired'),
        ('adjust', 'Adjustment'),
    )
    
    account = models.ForeignKey(LoyaltyAccount, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    points = models.IntegerField()
    description = models.CharField(max_length=255, blank=True)
    reference_id = models.CharField(max_length=100, blank=True, null=True, help_text="Order UUID or external ref")
    
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.CharField(max_length=100, blank=True)

    def __str__(self):
        return f"{self.transaction_type.upper()} {self.points} - {self.account}"
