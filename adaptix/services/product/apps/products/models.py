import uuid
from django.db import models
from django.utils import timezone

class SoftDeleteManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)

class SoftDeleteModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_uuid = models.UUIDField(db_index=True, editable=False) 
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_deleted = models.BooleanField(default=False)

    objects = SoftDeleteManager()
    all_objects = models.Manager()

    class Meta:
        abstract = True

    def delete(self, using=None, keep_parents=False):
        self.is_deleted = True
        self.save()

    def restore(self):
        self.is_deleted = False
        self.save()

class Category(SoftDeleteModel):
    name = models.CharField(max_length=255)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='children')
    icon = models.CharField(max_length=255, blank=True, null=True)
    description = models.TextField(blank=True, null=True)

    class Meta:
        unique_together = ('company_uuid', 'name')
    
    def __str__(self):
        return self.name

class Brand(SoftDeleteModel):
    name = models.CharField(max_length=255)
    logo = models.ImageField(upload_to="brands/", blank=True, null=True)
    
    class Meta:
        unique_together = ('company_uuid', 'name')

    def __str__(self):
        return self.name

class Unit(SoftDeleteModel):
    name = models.CharField(max_length=100) 
    short_name = models.CharField(max_length=20)
    allow_decimal = models.BooleanField(default=False)

    class Meta:
        unique_together = ('company_uuid', 'name')

    def __str__(self):
        return self.short_name


class AttributeSet(SoftDeleteModel):
    name = models.CharField(max_length=255)
    
    class Meta:
        unique_together = ('company_uuid', 'name')
    
    def __str__(self):
        return self.name

class Attribute(SoftDeleteModel):
    ATTRIBUTE_TYPE_CHOICES = (
        ('text', 'Text'),
        ('number', 'Number'),
        ('date', 'Date'),
        ('select', 'Select'), # Dropdown
        ('boolean', 'Yes/No'),
    )
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100) # Internal code, e.g., "fabric_type"
    type = models.CharField(max_length=20, choices=ATTRIBUTE_TYPE_CHOICES, default='text')
    options = models.JSONField(default=list, blank=True) # For 'select' type: ["Cotton", "Polyester"]
    is_required = models.BooleanField(default=False)
    
    # Link to a Set (e.g., "Men's Clothing" set has "Fabric", "Size")
    attribute_set = models.ForeignKey(AttributeSet, on_delete=models.CASCADE, related_name='attributes')

    class Meta:
        unique_together = ('company_uuid', 'attribute_set', 'code')

    def __str__(self):
        return f"{self.name} ({self.attribute_set.name})"

class Product(SoftDeleteModel):
    TYPE_CHOICES = (
        ('standard', 'Standard Product'), # Goods
        ('service', 'Service'),           # Doctor, Barber, Consultant
        ('combo', 'Combo'),               # Kit
        ('consumable', 'Consumable'),     # Stationary
    )
    TAX_METHOD_CHOICES = (
        ('exclusive', 'Exclusive'),
        ('inclusive', 'Inclusive'),
    )

    APPROVAL_STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    )

    name = models.CharField(max_length=255)
    product_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='standard') # Renamed from type
    
    approval_status = models.CharField(max_length=20, choices=APPROVAL_STATUS_CHOICES, default='pending')
    
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='products')
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    unit = models.ForeignKey(Unit, on_delete=models.SET_NULL, null=True, related_name='products')
    
    # Dynamic Attributes
    attribute_set = models.ForeignKey(AttributeSet, on_delete=models.SET_NULL, null=True, blank=True)
    attributes = models.JSONField(default=dict, blank=True) # {"fabric": "Cotton", "isbn": "123"}
    
    tax_type = models.CharField(max_length=50, blank=True, null=True) 
    tax_method = models.CharField(max_length=20, choices=TAX_METHOD_CHOICES, default='exclusive')
    
    description = models.TextField(blank=True, null=True)
    thumbnail = models.ImageField(upload_to="products/", blank=True, null=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

class ApprovalRequest(SoftDeleteModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='approval_requests')
    requested_by = models.UUIDField()
    approved_by = models.UUIDField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=Product.APPROVAL_STATUS_CHOICES, default='pending')
    comments = models.TextField(blank=True)
    
    class Meta:
        unique_together = ('company_uuid', 'product', 'status')

    def __str__(self):
        return f"Request for {self.product.name} ({self.status})"

class ProductVariant(SoftDeleteModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    name = models.CharField(max_length=255) 
    sku = models.CharField(max_length=100, db_index=True)
    
    # Dynamic Variant Attributes (e.g. {"size": "L", "color": "Red"})
    attributes = models.JSONField(default=dict, blank=True) 
    
    price = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    cost = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    
    quantity = models.DecimalField(max_digits=20, decimal_places=2, default=0) 
    alert_quantity = models.DecimalField(max_digits=20, decimal_places=2, default=10)

    class Meta:
        unique_together = ('company_uuid', 'sku')

    def __str__(self):
        return f"{self.product.name} - {self.name}"

    def save(self, *args, **kwargs):
        if not self.sku:
            self.sku = f"SKU-{str(uuid.uuid4())[:8].upper()}"
        super().save(*args, **kwargs)
