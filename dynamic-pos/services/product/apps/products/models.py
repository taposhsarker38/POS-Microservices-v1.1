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

class Product(SoftDeleteModel):
    TYPE_CHOICES = (
        ('standard', 'Standard'),
        ('service', 'Service'),
        ('combo', 'Combo'),
    )
    TAX_METHOD_CHOICES = (
        ('exclusive', 'Exclusive'),
        ('inclusive', 'Inclusive'),
    )

    name = models.CharField(max_length=255)
    type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='standard')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, related_name='products')
    brand = models.ForeignKey(Brand, on_delete=models.SET_NULL, null=True, blank=True, related_name='products')
    unit = models.ForeignKey(Unit, on_delete=models.SET_NULL, null=True, related_name='products')
    
    tax_type = models.CharField(max_length=50, blank=True, null=True) 
    tax_method = models.CharField(max_length=20, choices=TAX_METHOD_CHOICES, default='exclusive')
    
    description = models.TextField(blank=True, null=True)
    thumbnail = models.ImageField(upload_to="products/", blank=True, null=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

class ProductVariant(SoftDeleteModel):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='variants')
    name = models.CharField(max_length=255) 
    sku = models.CharField(max_length=100, db_index=True)
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
            # Auto-generate unique SKU: SKU-YYYYMMDD-XXXX
            # Simple version: SKU-{UUID}
            self.sku = f"SKU-{str(uuid.uuid4())[:8].upper()}"
        super().save(*args, **kwargs)
