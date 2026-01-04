from django.db import models
from apps.utils.models import SoftDeleteModel

class Warehouse(SoftDeleteModel):
    name = models.CharField(max_length=255)
    address = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    
    # Optional: Warehouse Type (e.g. 'Store', 'Main', 'Van')
    type = models.CharField(max_length=50, default='main')

    def __str__(self):
        return self.name

class Stock(SoftDeleteModel):
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='stocks')
    product_uuid = models.UUIDField(db_index=True) # Link to Product Service
    product_variant_uuid = models.UUIDField(db_index=True, null=True, blank=True)
    
    # Quantity is aggregated from Batches if batches exist, or direct if not
    quantity = models.DecimalField(max_digits=20, decimal_places=3, default=0)
    reorder_level = models.DecimalField(max_digits=20, decimal_places=3, default=10) # Default low stock threshold
    
    avg_cost = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    
    class Meta:
        unique_together = ('company_uuid', 'warehouse', 'product_uuid', 'product_variant_uuid')

    def __str__(self):
        return f"{self.product_uuid} @ {self.warehouse.name}"

class UOMConversion(SoftDeleteModel):
    """
    Defines conversion between units.
    e.g., product_uuid=X, from_unit="Box", to_unit="Pcs", factor=12
    quantity in from_unit * factor = quantity in to_unit
    """
    product_uuid = models.UUIDField(db_index=True)
    from_unit = models.CharField(max_length=50) 
    to_unit = models.CharField(max_length=50) # Base unit usually
    factor = models.DecimalField(max_digits=12, decimal_places=4)

    class Meta:
        unique_together = ('company_uuid', 'product_uuid', 'from_unit', 'to_unit')

    def __str__(self):
        return f"1 {self.from_unit} = {self.factor} {self.to_unit}"

class StockSerial(SoftDeleteModel):
    """
    For unique items (Electronics, Autos)
    """
    STATUS_CHOICES = (
        ('available', 'Available'),
        ('sold', 'Sold'),
        ('defective', 'Defective'),
        ('returned', 'Returned'),
        ('transfer', 'In Transfer'),
    )
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name='serials')
    serial_number = models.CharField(max_length=100)
    
    # Auto Specifics
    chassis_number = models.CharField(max_length=100, blank=True, null=True)
    engine_number = models.CharField(max_length=100, blank=True, null=True)
    color = models.CharField(max_length=50, blank=True, null=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    
    class Meta:
        unique_together = ('company_uuid', 'stock', 'serial_number')

    def __str__(self):
        return f"{self.serial_number} ({self.status})"

class BillOfMaterial(SoftDeleteModel):
    """
    Recipe/Manufacturing Formula.
    Parent (Burger) -> Child (Bun, Qty 1)
    """
    parent_product_uuid = models.UUIDField(db_index=True)
    child_product_uuid = models.UUIDField(db_index=True)
    
    quantity = models.DecimalField(max_digits=12, decimal_places=4) # How much child needed for 1 parent
    unit = models.CharField(max_length=50, blank=True, null=True) # e.g. 'grams'
    
    class Meta:
        unique_together = ('company_uuid', 'parent_product_uuid', 'child_product_uuid')

    def __str__(self):
        return f"{self.parent_product_uuid} needs {self.quantity} of {self.child_product_uuid}"

class Batch(SoftDeleteModel):
    """
    For Batch/Lot tracking (Medicine, FMCG)
    """
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name='batches')
    batch_number = models.CharField(max_length=100)
    manufacturing_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField(null=True, blank=True)
    
    quantity = models.DecimalField(max_digits=20, decimal_places=3, default=0)
    cost_price = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    sale_price = models.DecimalField(max_digits=20, decimal_places=2, blank=True, null=True)

    class Meta:
        unique_together = ('company_uuid', 'stock', 'batch_number')

    def __str__(self):
        return f"{self.batch_number} (Exp: {self.expiry_date})"

class StockTransaction(SoftDeleteModel):
    TX_TYPES = (
        ('in', 'In (Purchase)'),
        ('out', 'Out (Sale)'),
        ('transfer_in', 'Transfer In'),
        ('transfer_out', 'Transfer Out'),
        ('adjustment_add', 'Adjustment (Add)'),
        ('adjustment_sub', 'Adjustment (Sub)'),
        ('return', 'Return'),
    )
    
    stock = models.ForeignKey(Stock, on_delete=models.CASCADE, related_name='transactions')
    batch = models.ForeignKey(Batch, on_delete=models.SET_NULL, null=True, blank=True)
    
    type = models.CharField(max_length=20, choices=TX_TYPES)
    quantity_change = models.DecimalField(max_digits=20, decimal_places=3) # Can be negative
    balance_after = models.DecimalField(max_digits=20, decimal_places=3)
    
    reference_no = models.CharField(max_length=100, blank=True, null=True) # e.g. PO-101, INV-202
    notes = models.TextField(blank=True, null=True)
    
    created_by = models.CharField(max_length=100, blank=True, null=True)

class StockTransfer(SoftDeleteModel):
    STATUS_CHOICES = (
        ('DRAFT', 'Draft'),
        ('SHIPPED', 'Shipped'),
        ('RECEIVED', 'Received'),
        ('CANCELLED', 'Cancelled'),
    )
    
    source_warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='transfers_sent')
    destination_warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='transfers_received')
    
    reference_no = models.CharField(max_length=100, unique=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    
    notes = models.TextField(blank=True, null=True)
    
    transfer_date = models.DateTimeField(auto_now_add=True)
    created_by = models.CharField(max_length=100, blank=True, null=True)

    def __str__(self):
        return f"Transfer {self.reference_no} ({self.source_warehouse} -> {self.destination_warehouse})"

class StockTransferItem(SoftDeleteModel):
    transfer = models.ForeignKey(StockTransfer, on_delete=models.CASCADE, related_name='items')
    product_uuid = models.UUIDField(db_index=True)
    quantity = models.DecimalField(max_digits=20, decimal_places=3)
    
    def __str__(self):
        return f"{self.product_uuid} x {self.quantity}"

# Signals
from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.utils.notifications import NotificationService

@receiver(post_save, sender=Stock)
def check_low_stock(sender, instance, created, **kwargs):
    if instance.quantity <= instance.reorder_level:
        notify = NotificationService()
        notify.send_notification(
            event_type="stock.low",
            data={
                "product_uuid": str(instance.product_uuid),
                "quantity": float(instance.quantity),
                "warehouse": instance.warehouse.name
            },
            rooms=[str(instance.company_uuid)]
        )
