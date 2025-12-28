import uuid
from django.db import models
from django.db.models import Q

class SoftDeleteManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(is_deleted=False)

class SoftDeleteModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_uuid = models.UUIDField(db_index=True, null=True, blank=True) 
    branch_id = models.UUIDField(null=True, blank=True, db_index=True) # Creation Branch
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
        ('select', 'Select'),
        ('boolean', 'Yes/No'),
    )
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100)
    type = models.CharField(max_length=20, choices=ATTRIBUTE_TYPE_CHOICES, default='text')
    options = models.JSONField(default=list, blank=True)
    is_required = models.BooleanField(default=False)
    
    attribute_set = models.ForeignKey(AttributeSet, on_delete=models.CASCADE, related_name='attributes')

    class Meta:
        unique_together = ('company_uuid', 'attribute_set', 'code')

    def __str__(self):
        return f"{self.name} ({self.attribute_set.name})"

class Customer(SoftDeleteModel):
    class Tier(models.TextChoices):
        SILVER = 'SILVER', 'Silver'
        GOLD = 'GOLD', 'Gold'
        PLATINUM = 'PLATINUM', 'Platinum'
        ELITE = 'ELITE', 'Elite'

    name = models.CharField(max_length=255)
    phone = models.CharField(max_length=50) # Unique constraint handled in Meta
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    loyalty_points = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    tier = models.CharField(
        max_length=20, 
        choices=Tier.choices, 
        default=Tier.SILVER
    )
    
    # Verification
    is_email_verified = models.BooleanField(default=False, null=True)
    is_phone_verified = models.BooleanField(default=False, null=True)
    email_otp = models.CharField(max_length=6, blank=True, null=True)
    phone_otp = models.CharField(max_length=6, blank=True, null=True)
    
    # Dynamic Attributes
    attribute_set = models.ForeignKey(AttributeSet, on_delete=models.SET_NULL, null=True, blank=True)
    attributes = models.JSONField(default=dict, blank=True) 

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['phone'], 
                name='unique_active_customer_phone', 
                condition=Q(is_deleted=False)
            )
        ] 

    def calculate_tier(self):
        """Update tier based on points"""
        points = float(self.loyalty_points)
        old_tier = self.tier
        
        if points >= 2000:
            self.tier = self.Tier.ELITE
        elif points >= 1000:
            self.tier = self.Tier.PLATINUM
        elif points >= 500:
            self.tier = self.Tier.GOLD
        else:
            self.tier = self.Tier.SILVER
            
        if old_tier != self.tier:
            self.save(update_fields=['tier'])

    def __str__(self):
        return f"{self.name} ({self.phone}) - {self.tier}"
