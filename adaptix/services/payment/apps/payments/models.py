import uuid
from django.db import models
from django.utils import timezone

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
        ('bank_transfer', 'Bank Transfer'),
        ('check', 'Check'),
    )

    TYPE_CHOICES = (
        ('inbound', 'Inbound (Sales)'), # Money coming in
        ('outbound', 'Outbound (Purchase)'), # Money going out
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_id = models.UUIDField(help_text="Reference to the Order in POS service")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    currency = models.CharField(max_length=3, default='USD')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, default='card')
    payment_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='inbound')
    
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

from dateutil.relativedelta import relativedelta

class SoftDeleteModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_uuid = models.UUIDField(db_index=True, null=True, blank=True) 
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        self.is_deleted = True
        self.save()

class EMIPlan(SoftDeleteModel):
    INTEREST_TYPE_CHOICES = (
        ('flat', 'Flat Rate'),
        ('reducing', 'Reducing Balance (Not Implemented Yet)'),
    )
    
    name = models.CharField(max_length=100) # e.g. "Bkash 6 Months"
    provider = models.CharField(max_length=100, default='Store') # Store or Bank Name
    tenure_months = models.PositiveIntegerField()
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.0) # Annual %
    interest_type = models.CharField(max_length=20, choices=INTEREST_TYPE_CHOICES, default='flat')
    
    min_amount = models.DecimalField(max_digits=12, decimal_places=2, default=1000.0)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.name} ({self.tenure_months}m @ {self.interest_rate}%)"

class EMISchedule(SoftDeleteModel):
    STATUS_CHOICES = (
        ('active', 'Active'),
        ('completed', 'Completed'),
        ('defaulted', 'Defaulted'),
        ('cancelled', 'Cancelled'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order_id = models.UUIDField(db_index=True)
    plan = models.ForeignKey(EMIPlan, on_delete=models.PROTECT, related_name='schedules')
    customer_uuid = models.UUIDField(db_index=True, null=True, blank=True)
    
    principal_amount = models.DecimalField(max_digits=12, decimal_places=2)
    interest_amount = models.DecimalField(max_digits=12, decimal_places=2)
    total_payable = models.DecimalField(max_digits=12, decimal_places=2)
    
    monthly_installment = models.DecimalField(max_digits=12, decimal_places=2)
    
    start_date = models.DateField(default=timezone.now)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    
    raw_response = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"EMI for Order {self.order_id}"

    def generate_installments(self):
        self.installments.all().delete()
        installment_amount = self.monthly_installment
        current_date = self.start_date
        
        for i in range(1, self.plan.tenure_months + 1):
            due_date = current_date + relativedelta(months=1)
            EMIInstallment.objects.create(
                schedule=self,
                installment_number=i,
                due_date=due_date,
                amount=installment_amount,
                status='pending'
            )
            current_date = due_date

class EMIInstallment(SoftDeleteModel):
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('paid', 'Paid'),
        ('overdue', 'Overdue'),
    )
    
    schedule = models.ForeignKey(EMISchedule, on_delete=models.CASCADE, related_name='installments')
    installment_number = models.PositiveIntegerField()
    due_date = models.DateField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    paid_date = models.DateField(null=True, blank=True)
    penalty_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    class Meta:
        ordering = ['due_date']
        unique_together = ('schedule', 'installment_number')

    def __str__(self):
        return f"{self.schedule.order_id} - #{self.installment_number} ({self.amount})"
