from django.db import models
from apps.utils.models import SoftDeleteModel
from apps.vendors.models import Vendor

class RFQ(SoftDeleteModel):
    STATUS_CHOICES = (
        ('open', 'Open'),
        ('closed', 'Closed'),
        ('converted', 'Converted to PO'),
        ('cancelled', 'Cancelled'),
    )

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    product_uuid = models.UUIDField(db_index=True)
    variant_uuid = models.UUIDField(db_index=True, blank=True, null=True)
    quantity = models.DecimalField(max_digits=12, decimal_places=4)
    deadline = models.DateTimeField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    
    # Selection
    selected_quote = models.OneToOneField('VendorQuote', on_delete=models.SET_NULL, null=True, blank=True, related_name='selected_for_rfq')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"RFQ: {self.title} ({self.status})"

class VendorQuote(SoftDeleteModel):
    rfq = models.ForeignKey(RFQ, on_delete=models.CASCADE, related_name='quotes')
    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='quotes')
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    delivery_lead_time_days = models.PositiveIntegerField(help_text="Days to deliver")
    valid_until = models.DateTimeField()
    notes = models.TextField(blank=True, null=True)
    
    is_winning_quote = models.BooleanField(default=False)

    class Meta:
        unique_together = ('rfq', 'vendor', 'company_uuid')

    def __str__(self):
        return f"Quote from {self.vendor.name} for {self.rfq.title}: {self.unit_price}"

class PurchaseOrder(SoftDeleteModel):
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('pending_approval', 'Pending Approval'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('ordered', 'Ordered'),
        ('processing', 'Processing (Inventory)'),
        ('received', 'Received'),
        ('cancelled', 'Cancelled'),
    )

    vendor = models.ForeignKey(Vendor, on_delete=models.CASCADE, related_name='orders')
    reference_number = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    
    # Payment Tracking
    PAYMENT_STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('partial', 'Partially Paid'),
        ('paid', 'Fully Paid'),
        ('overdue', 'Overdue'),
    )
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Approval
    approval_status = models.CharField(max_length=20, default='pending', choices=(('pending','Pending'), ('approved','Approved'), ('rejected','Rejected')))
    approved_by = models.CharField(max_length=100, blank=True, null=True) # User ID
    approved_at = models.DateTimeField(blank=True, null=True)

    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    date_issued = models.DateField(auto_now_add=True)
    notes = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ('company_uuid', 'reference_number')

    def __str__(self):
        return f"{self.reference_number} - {self.vendor.name}"

class PurchaseOrderItem(SoftDeleteModel):
    order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items')
    product_uuid = models.UUIDField(db_index=True)
    variant_uuid = models.UUIDField(db_index=True, blank=True, null=True)
    quantity = models.DecimalField(max_digits=12, decimal_places=4)
    unit_cost = models.DecimalField(max_digits=12, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # We might want to track received quantity vs ordered if partial receipt is supported later
    # For V1, we assume full receipt.

    def __str__(self):
        return f"{self.product_uuid} x {self.quantity}"
