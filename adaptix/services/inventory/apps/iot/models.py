from django.db import models
from apps.utils.models import SoftDeleteModel
from apps.stocks.models import Warehouse, Stock
from django.db.models.signals import post_save
from django.dispatch import receiver
from apps.utils.notifications import NotificationService
from decimal import Decimal

class Shelf(SoftDeleteModel):
    """
    Represents a physical location (Shelf/Bin) in a warehouse.
    Simplification: Each shelf is assigned to one Product Variant.
    """
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='shelves')
    code = models.CharField(max_length=50) # e.g. "A-01-05"
    
    # What product is supposed to be here?
    product_uuid = models.UUIDField(db_index=True, null=True, blank=True)
    
    # Physical constraints
    max_weight_capacity = models.DecimalField(max_digits=10, decimal_places=3, default=100.0) # kg
    
    class Meta:
        unique_together = ('company_uuid', 'warehouse', 'code')

    def __str__(self):
        return f"{self.code} @ {self.warehouse.name}"

class IoTDevice(SoftDeleteModel):
    DEVICE_TYPES = (
        ('scale', 'Smart Scale'),
        ('thermometer', 'Thermometer'),
        ('camera', 'Camera'),
    )
    
    device_id = models.CharField(max_length=100, unique=True, help_text="Hardware Serial/MAC")
    name = models.CharField(max_length=100)
    type = models.CharField(max_length=20, choices=DEVICE_TYPES)
    
    warehouse = models.ForeignKey(Warehouse, on_delete=models.CASCADE, related_name='iot_devices')
    shelf = models.ForeignKey(Shelf, on_delete=models.SET_NULL, null=True, blank=True, related_name='devices')
    
    # Configuration
    api_key = models.CharField(max_length=100, blank=True, null=True) # Simple auth
    is_active = models.BooleanField(default=True)
    
    # For Scales: Calibration
    tare_weight = models.DecimalField(max_digits=10, decimal_places=3, default=0.0)
    
    class Meta:
        unique_together = ('company_uuid', 'device_id')

    def __str__(self):
        return f"{self.name} ({self.type})"

class IoTReading(models.Model): # High volume, maybe no SoftDelete? keeping it simple with Model
    """
    Append-only log of sensor readings.
    """
    device = models.ForeignKey(IoTDevice, on_delete=models.CASCADE, related_name='readings')
    timestamp = models.DateTimeField(auto_now_add=True)
    
    # We store the raw value. Interpretation depends on device type.
    # Scale -> value = weight in kg
    # Thermometer -> value = temp in Celsius
    value = models.DecimalField(max_digits=12, decimal_places=4)
    
    unit = models.CharField(max_length=20, default='unit')
    
    metadata = models.JSONField(default=dict, blank=True) 

    class Meta:
        indexes = [
            models.Index(fields=['device', 'timestamp']),
        ]
        ordering = ['-timestamp']

    def __str__(self):
        return f"{self.device.name}: {self.value} {self.unit} at {self.timestamp}"


# ==========================================================
# LOGIC / SIGNALS
# ==========================================================

@receiver(post_save, sender=IoTReading)
def process_iot_reading(sender, instance, created, **kwargs):
    if not created:
        return

    device = instance.device
    
    # 1. SMART SCALE LOGIC
    if device.type == 'scale' and device.shelf and device.shelf.product_uuid:
        # Calculate Net Weight
        gross_weight = instance.value
        net_weight = gross_weight - Decimal(device.tare_weight)
        
        if net_weight < 0: 
            net_weight = Decimal(0)

        # We need the "Product Unit Weight" to calculate quantity.
        # Ideally this comes from Product Service. 
        # For this prototype, we will assume a fixed unit weight or look it up from a cache or metadata.
        # Let's assume it's stored in Shelf metadata or we default to 1 (if liquid/bulk).
        
        # fallback: assume 1kg = 1 unit for now if not specified
        unit_weight = Decimal('1.0') 
        
        calculated_qty = net_weight / unit_weight
        
        # Update Stock
        # Find the Stock record for this Warehouse + Product
        stock_qs = Stock.objects.filter(
            company_uuid=device.company_uuid,
            warehouse=device.warehouse,
            product_uuid=device.shelf.product_uuid
        )
        
        if stock_qs.exists():
            stock = stock_qs.first()
            # Update quantity to match physical reality
            # Note: This overrides manual entries. In a real system you'd want a reconciliation flow.
            # Here we trust the machine.
            stock.quantity = calculated_qty
            stock.save(update_fields=['quantity'])
            
            # Log the adjustment? (Ideally yes, create StockTransaction)
            # Skipping StockTransaction for brevity, but this is where it would go.

    # 2. THERMOMETER LOGIC
    elif device.type == 'thermometer':
        # Simple threshold check
        MAX_TEMP = 25.0
        MIN_TEMP = 2.0
        
        if instance.value > MAX_TEMP or instance.value < MIN_TEMP:
            # Trigger Alert
            notify = NotificationService()
            notify.send_notification(
                event_type="iot.temp_alert",
                data={
                    "device": device.name,
                    "location": device.warehouse.name,
                    "value": float(instance.value),
                    "unit": instance.unit
                },
                rooms=[str(device.company_uuid)]
            )
