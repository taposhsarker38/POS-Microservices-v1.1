import uuid
from django.db import models
from django.utils import timezone
from apps.utils.models import SoftDeleteModel

class POSSettings(SoftDeleteModel):
    allow_partial_payment = models.BooleanField(default=True)
    allow_split_payment = models.BooleanField(default=True)
    default_tax_zone_code = models.CharField(max_length=50, blank=True, null=True)
    company_uuid = models.UUIDField(editable=False) # Simplified specific settings per company

    def __str__(self):
        return f"Settings for {self.company_uuid}"

class POSSession(SoftDeleteModel):
    STATUS_CHOICES = (
        ('open', 'Open'),
        ('closed', 'Closed'),
        ('reconciled', 'Reconciled'),
    )
    user_uuid = models.UUIDField() # Cashier
    
    opening_balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    closing_balance = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    expected_balance = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    start_time = models.DateTimeField(default=timezone.now)
    end_time = models.DateTimeField(null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    
    note = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"Session {self.id} - {self.status}"

class Order(SoftDeleteModel):
    # ... (existing choices) ...
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('confirmed', 'Confirmed'),
        ('processing', 'Processing'),
        ('ready', 'Ready'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
        ('returned', 'Returned'),
    )
    # ... (existing choices) ...

    PAYMENT_STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('partial', 'Partial'),
        ('paid', 'Paid'),
        ('on_emi', 'On EMI'),
        ('refunded', 'Refunded'),
    )
    MODULE_TYPE_CHOICES = (
        ('retail', 'Retail'),
        ('restaurant', 'Restaurant'),
        ('service', 'Service'),
        ('booking', 'Booking'),
        ('rental', 'Rental'),
        ('medical', 'Medical'),
        ('consultancy', 'Consultancy'),
        ('manufacturing', 'Manufacturing'),
    )
    
    # Core Info
    order_number = models.CharField(max_length=50, unique=True, editable=False) # e.g. INV-2023-0001
    module_type = models.CharField(max_length=50, choices=MODULE_TYPE_CHOICES, default='retail')
    session = models.ForeignKey(POSSession, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    
    # Customer Info
    customer_uuid = models.UUIDField(blank=True, null=True) # Link to Auth/CRM
    customer_name = models.CharField(max_length=255, default="Guest")
    customer_phone = models.CharField(max_length=50, blank=True, null=True)
    customer_address = models.TextField(blank=True, null=True)
    
    # Scheduling & Logistics (Restaurant, Delivery, Appt)
    table_number = models.CharField(max_length=50, blank=True, null=True)
    token_number = models.CharField(max_length=50, blank=True, null=True)
    delivery_date = models.DateTimeField(blank=True, null=True)
    pickup_date = models.DateTimeField(blank=True, null=True)
    
    # Financials
    currency = models.CharField(max_length=10, default='USD') # Store code e.g. USD, BDT
    subtotal = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    service_charge = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    grand_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    paid_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    due_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    tax_zone_code = models.CharField(max_length=50, blank=True, null=True, help_text="Code of the tax zone for this order")
    
    # Meta
    company_uuid = models.UUIDField(editable=False) # Multi-tenant
    branch_id = models.UUIDField(null=True, blank=True, db_index=True) # Branch-wise report
    created_by = models.CharField(max_length=100, blank=True, null=True) # User ID
    metadata = models.JSONField(default=dict, blank=True) # For any extra fields (Doctor Name, Case ID, Event Details)

    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = f"INV-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def update_payment_status(self):
        """Recalculate paid_amount, due_amount and update payment_status"""
        all_payments = self.payments.all()
        
        # Immediate payments: Cash, Card, Mobile, Bank, Cheque
        immediate_payment_methods = ['cash', 'card', 'mobile_banking', 'bank_transfer', 'cheque']
        total_immediate_paid = sum(p.amount for p in all_payments if p.method in immediate_payment_methods)
        
        # Deferred/promised payments: EMI, Store Credit/Credit
        total_promised = sum(p.amount for p in all_payments if p.method in ['emi', 'credit'])
        
        self.paid_amount = total_immediate_paid
        # Total "covered" includes what is promised via EMI
        total_covered = total_immediate_paid + total_promised
        self.due_amount = self.grand_total - total_covered
        
        if total_covered >= self.grand_total:
            if total_promised > 0:
                self.payment_status = 'on_emi'
            else:
                self.payment_status = 'paid'
        elif total_covered > 0:
            self.payment_status = 'partial'
        else:
            self.payment_status = 'pending'
            
        self.save()

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.order_number} ({self.customer_name})"

class OrderItem(SoftDeleteModel):
    ITEM_TYPE_CHOICES = (
        ('product', 'Product'),
        ('service', 'Service'),
        ('rental', 'Rental'),
        ('fee', 'Fee'),
        ('package', 'Package'),
    )

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    item_type = models.CharField(max_length=20, choices=ITEM_TYPE_CHOICES, default='product')
    
    # Product Snapshot / Service Info
    product_uuid = models.UUIDField(blank=True, null=True) # Nullable for custom services/fees
    product_name = models.CharField(max_length=255)
    sku = models.CharField(max_length=100, blank=True, null=True)
    
    # Sales Data
    quantity = models.DecimalField(max_digits=10, decimal_places=3, default=1)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2) 
    subtotal = models.DecimalField(max_digits=12, decimal_places=2)
    tax_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    # Service / Rental Specifics
    start_time = models.DateTimeField(blank=True, null=True) # For Rentals/Bookings
    end_time = models.DateTimeField(blank=True, null=True)
    assigned_staff_uuid = models.UUIDField(blank=True, null=True) # For Salon/Medical
    
    # Dynamic Attributes
    variant_attributes = models.JSONField(default=dict, blank=True) # e.g. {"size": "L", "color": "Red"}
    metadata = models.JSONField(default=dict, blank=True) # e.g. {"kitchen_note": "No onion", "prescription": "..."}
    
    company_uuid = models.UUIDField(editable=False)

    def save(self, *args, **kwargs):
        # Basic calculation, can be overridden by logic ensuring tax/discount is pre-calculated or calculated here
        if self.subtotal is None:
             self.subtotal = (self.quantity * self.unit_price) - self.discount_amount + self.tax_amount
        super().save(*args, **kwargs)

class Payment(SoftDeleteModel):
    METHOD_CHOICES = (
        ('cash', 'Cash'),
        ('card', 'Card'),
        ('mobile_banking', 'Mobile Banking'),
        ('bank_transfer', 'Bank Transfer'),
        ('cheque', 'Cheque'),
        ('credit', 'Store Credit'),
        ('emi', 'EMI'),
    )
    
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='payments')
    method = models.CharField(max_length=50, choices=METHOD_CHOICES, default='cash')
    provider = models.CharField(max_length=100, blank=True, null=True, help_text="Bank or Mobile Banking provider (e.g. Bkash, Nagad, Brac Bank)")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    emi_plan = models.UUIDField(blank=True, null=True, help_text="ID of the EMI plan if method is emi")
    transaction_id = models.CharField(max_length=100, blank=True, null=True)
    note = models.TextField(blank=True, null=True)
    
    company_uuid = models.UUIDField(editable=False)
    created_by = models.CharField(max_length=100, blank=True, null=True)

class OrderReturn(SoftDeleteModel):
    STATUS_CHOICES = (
        ('requested', 'Requested'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('completed', 'Completed'),
    )
    
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='returns')
    return_number = models.CharField(max_length=50, unique=True, editable=False)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='requested')
    reason = models.TextField(blank=True, null=True)
    
    refund_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    company_uuid = models.UUIDField(editable=False)
    created_by = models.UUIDField(editable=False)
    approved_by = models.UUIDField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.return_number:
            self.return_number = f"RET-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.return_number} for {self.order.order_number}"

class ReturnItem(SoftDeleteModel):
    CONDITION_CHOICES = (
        ('good', 'Good'),
        ('damaged', 'Damaged'),
        ('defective', 'Defective'),
    )

    return_request = models.ForeignKey(OrderReturn, on_delete=models.CASCADE, related_name='items')
    order_item = models.ForeignKey(OrderItem, on_delete=models.CASCADE)
    
    quantity = models.DecimalField(max_digits=10, decimal_places=3)
    condition = models.CharField(max_length=20, choices=CONDITION_CHOICES, default='good')
    
    def __str__(self):
        return f"{self.quantity} x {self.order_item.product_name}"
