from django.db import models
from django.conf import settings
import uuid

class WorkCenter(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    capacity_per_day = models.DecimalField(max_digits=10, decimal_places=2, help_text="Units per day capacity")
    
    company_uuid = models.UUIDField(db_index=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.code})"

class Operation(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    work_center = models.ForeignKey(WorkCenter, on_delete=models.SET_NULL, null=True, blank=True)
    
    company_uuid = models.UUIDField(db_index=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.code})"

class BillOfMaterial(models.Model):
    """
    Recipe for a product.
    product_uuid: The Finished Good.
    """
    product_uuid = models.UUIDField(db_index=True)
    name = models.CharField(max_length=255, help_text="e.g. Standard Recipe v1")
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1.0, help_text="Output Quantity")
    is_active = models.BooleanField(default=True)
    version = models.CharField(max_length=20, default='1.0')
    
    company_uuid = models.UUIDField(db_index=True, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"BOM for {self.product_uuid} - {self.name}"

class BOMOperation(models.Model):
    bom = models.ForeignKey(BillOfMaterial, on_delete=models.CASCADE, related_name='operations')
    operation = models.ForeignKey(Operation, on_delete=models.CASCADE)
    sequence = models.PositiveIntegerField(default=1)
    estimated_time_minutes = models.PositiveIntegerField(default=60)

    class Meta:
        ordering = ['sequence']

    def __str__(self):
        return f"{self.bom.name} - {self.operation.name} (Seq: {self.sequence})"

class BOMItem(models.Model):
    """
    Ingredients/Components for the recipe.
    component_uuid: The Raw Material.
    """
    bom = models.ForeignKey(BillOfMaterial, on_delete=models.CASCADE, related_name='items')
    component_uuid = models.UUIDField(db_index=True)
    quantity = models.DecimalField(max_digits=10, decimal_places=3, help_text="Quantity required per BOM output")
    waste_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=0.0)

    def __str__(self):
        return f"{self.component_uuid} x {self.quantity}"

class ProductionOrder(models.Model):
    STATUS_CHOICES = (
        ('DRAFT', 'Draft'),
        ('CONFIRMED', 'Confirmed'),
        ('IN_PROGRESS', 'In Progress'),
        ('QUALITY_CHECK', 'Quality Check'),
        ('REWORK', 'Rework'),
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    )

    work_center = models.ForeignKey(WorkCenter, on_delete=models.SET_NULL, null=True, blank=True)
    product_uuid = models.UUIDField(db_index=True)
    
    # Unique identifier for the order, used by other services (Quality, etc)
    uuid = models.UUIDField(default=uuid.uuid4, editable=False, db_index=True)
    
    bom = models.ForeignKey(BillOfMaterial, on_delete=models.SET_NULL, null=True, related_name='production_orders')
    
    quantity_planned = models.DecimalField(max_digits=10, decimal_places=2)
    quantity_produced = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    
    start_date = models.DateField(null=True, blank=True)
    due_date = models.DateField(null=True, blank=True)
    
    # Smart Output: Destination Warehouse for Finished Goods
    target_warehouse_uuid = models.UUIDField(db_index=True, null=True, blank=True)
    
    # Linked Order from Head Office (Sales/POS)
    source_order_uuid = models.UUIDField(db_index=True, null=True, blank=True)
    source_order_number = models.CharField(max_length=100, null=True, blank=True)
    
    # Audit trail for QC cycles
    qc_history = models.JSONField(default=list, blank=True)
    
    notes = models.TextField(blank=True)
    
    company_uuid = models.UUIDField(db_index=True, null=True, blank=True)
    created_by = models.CharField(max_length=255, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"PO-{self.id} {self.product_uuid}"

class ProductionOrderOperation(models.Model):
    STATUS_CHOICES = (
        ('PENDING', 'Pending'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
        ('FAILED', 'Failed'),
    )
    
    production_order = models.ForeignKey(ProductionOrder, on_delete=models.CASCADE, related_name='operation_trackers')
    operation = models.ForeignKey(Operation, on_delete=models.CASCADE)
    sequence = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    actual_time_minutes = models.PositiveIntegerField(null=True, blank=True)
    
    operator_id = models.CharField(max_length=255, null=True, blank=True)
    assigned_worker_uuids = models.JSONField(default=list, blank=True, help_text="List of worker UUIDs assigned (HRMS)")
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['sequence']

    def __str__(self):
        return f"PO-{self.production_order_id} - {self.operation.name}"
