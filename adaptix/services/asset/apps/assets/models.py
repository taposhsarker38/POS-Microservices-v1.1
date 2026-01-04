import uuid
from decimal import Decimal
from django.db import models
from django.utils import timezone

class AssetCategory(models.Model):
    """
    Groups assets: 'Laptops', 'Vehicles', 'Furniture'.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_uuid = models.UUIDField(db_index=True)
    name = models.CharField(max_length=100)
    depreciation_rate = models.DecimalField(max_digits=5, decimal_places=2, help_text="Annual depreciation %")
    useful_life_years = models.PositiveIntegerField(default=5)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('company_uuid', 'name')

    def __str__(self):
        return self.name

class Asset(models.Model):
    STATUS_CHOICES = (
        ('draft', 'Draft'),
        ('active', 'Active'),
        ('maintenance', 'In Maintenance'),
        ('retired', 'Retired'),
        ('disposed', 'Disposed'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_uuid = models.UUIDField(db_index=True)
    category = models.ForeignKey(AssetCategory, on_delete=models.PROTECT, related_name='assets')
    
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=50, blank=True, null=True) # Barcode/Asset Tag
    serial_number = models.CharField(max_length=100, blank=True, null=True)
    
    purchase_date = models.DateField()
    purchase_cost = models.DecimalField(max_digits=12, decimal_places=2)
    current_value = models.DecimalField(max_digits=12, decimal_places=2)
    
    location = models.CharField(max_length=255, blank=True)
    assigned_to = models.UUIDField(null=True, blank=True, help_text="Employee UUID")
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    notes = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.code or 'No Code'} - {self.name}"

class DepreciationSchedule(models.Model):
    """
    Tracks value reduction over time.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='depreciations')
    date = models.DateField()
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    opening_value = models.DecimalField(max_digits=12, decimal_places=2)
    closing_value = models.DecimalField(max_digits=12, decimal_places=2)
    
    is_posted = models.BooleanField(default=False, help_text="Posted to Accounting?")
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.asset} - {self.date} (-{self.amount})"

class AssetTelemetry(models.Model):
    """
    Stores raw sensor data from IoT devices.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='telemetry')
    
    timestamp = models.DateTimeField(default=timezone.now, db_index=True)
    
    temperature = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, help_text="Celsius")
    vibration = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True, help_text="G-force/mm/s")
    power_usage = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Watts/kWh")
    usage_hours = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Cumulative hours")
    
    # Raw JSON for any other non-standard sensors
    metadata = models.JSONField(null=True, blank=True)

    class Meta:
        ordering = ['-timestamp']
        verbose_name_plural = "Asset Telemetry"

    def __str__(self):
        return f"Telemetry for {self.asset} at {self.timestamp}"

class AssetMaintenanceTask(models.Model):
    """
    Tracks maintenance for assets. Can be scheduled or AI-triggered.
    """
    PRIORITY_CHOICES = (
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    )
    
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )

    TYPE_CHOICES = (
        ('routine', 'Routine'),
        ('repair', 'Repair'),
        ('preventive', 'Preventive (AI)'),
        ('emergency', 'Emergency'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_uuid = models.UUIDField(db_index=True)
    asset = models.ForeignKey(Asset, on_delete=models.CASCADE, related_name='maintenance_tasks')
    
    task_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='routine')
    priority = models.CharField(max_length=20, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    
    title = models.CharField(max_length=200)
    description = models.TextField()
    
    suggested_date = models.DateField(null=True, blank=True)
    scheduled_date = models.DateField(null=True, blank=True)
    completed_date = models.DateField(null=True, blank=True)
    
    cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    performed_by = models.CharField(max_length=255, blank=True) # Expert or Vendor name
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.task_type} - {self.title} ({self.status})"
