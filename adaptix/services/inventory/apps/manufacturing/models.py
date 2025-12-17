from django.db import models

class WorkCenter(models.Model):
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    capacity_per_day = models.DecimalField(max_digits=10, decimal_places=2, help_text="Units per day capacity")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.code})"

class BillOfMaterial(models.Model):
    # product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='boms')
    product_uuid = models.UUIDField(db_index=True)
    name = models.CharField(max_length=255, help_text="e.g. Standard Recipe v1")
    quantity = models.DecimalField(max_digits=10, decimal_places=2, default=1.0, help_text="Output Quantity")
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"BOM for {self.product_uuid} - {self.name}"

class BOMItem(models.Model):
    bom = models.ForeignKey(BillOfMaterial, on_delete=models.CASCADE, related_name='items')
    # component = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='used_in_boms')
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
        ('COMPLETED', 'Completed'),
        ('CANCELLED', 'Cancelled'),
    )

    work_center = models.ForeignKey(WorkCenter, on_delete=models.SET_NULL, null=True, blank=True)
    # product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='production_orders')
    product_uuid = models.UUIDField(db_index=True)
    bom = models.ForeignKey(BillOfMaterial, on_delete=models.SET_NULL, null=True, related_name='production_orders')
    
    quantity_planned = models.DecimalField(max_digits=10, decimal_places=2)
    quantity_produced = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT')
    
    start_date = models.DateField(null=True, blank=True)
    end_date = models.DateField(null=True, blank=True)
    
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"PO-{self.id} {self.product_uuid}"
