from django.db import models
import uuid

class DefectCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_uuid = models.UUIDField(db_index=True)
    name = models.CharField(max_length=100) # e.g. Cooling, Body, Electrical
    description = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name

class QualityStandard(models.Model):
    product_uuid = models.UUIDField(db_index=True)
    name = models.CharField(max_length=255)
    criteria = models.TextField()
    tolerance_min = models.FloatField(null=True, blank=True)
    tolerance_max = models.FloatField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} for {self.product_uuid}"

class Inspection(models.Model):
    TYPE_CHOICES = [
        ('INVENTORY', 'Inventory'),
        ('PRODUCTION', 'Production Order'),
        ('RECEIVING', 'Receiving'),
    ]
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PASSED', 'Passed'),
        ('REJECTED', 'Rejected'), # Renamed from FAILED to REJECTED for better flow
        ('REWORK', 'In Rework'),
    ]

    reference_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    reference_uuid = models.UUIDField(db_index=True)
    inspector_id = models.IntegerField(null=True, blank=True) 
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    notes = models.TextField(blank=True, null=True)
    
    # Advanced Phase Fields
    defect_category = models.ForeignKey(DefectCategory, on_delete=models.SET_NULL, null=True, blank=True)
    rework_count = models.PositiveIntegerField(default=0)
    
    inspection_date = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.reference_type} {self.reference_uuid} - {self.status}"

class InspectionPhoto(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    inspection = models.ForeignKey(Inspection, on_delete=models.CASCADE, related_name='photos')
    photo_url = models.URLField(max_length=500) # Cloud storage URL
    caption = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

class TestResult(models.Model):
    inspection = models.ForeignKey(Inspection, on_delete=models.CASCADE, related_name='results')
    standard = models.ForeignKey(QualityStandard, on_delete=models.CASCADE)
    measured_value = models.FloatField(null=True, blank=True)
    passed = models.BooleanField()
    notes = models.TextField(blank=True, null=True)

    def __str__(self):
        return f"{self.standard.name}: {'PASS' if self.passed else 'FAIL'}"
