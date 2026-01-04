from django.db import models
import uuid

class Vehicle(models.Model):
    STATUS_CHOICES = [
        ('AVAILABLE', 'Available'),
        ('IN_TRANSIT', 'In Transit'),
        ('MAINTENANCE', 'Maintenance'),
    ]
    
    company_uuid = models.UUIDField(db_index=True, null=True)
    branch_id = models.UUIDField(db_index=True, null=True)
    
    license_plate = models.CharField(max_length=20, unique=True)
    capacity = models.FloatField(help_text="Capacity in KG or Volume")
    model = models.CharField(max_length=100)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='AVAILABLE')
    # Link to HRMS Employee (Driver)
    driver_uuid = models.UUIDField(null=True, blank=True, db_index=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.license_plate} ({self.status})"

class DeliveryRoute(models.Model):
    STATUS_CHOICES = [
        ('PLANNED', 'Planned'),
        ('STARTED', 'Started'),
        ('COMPLETED', 'Completed'),
    ]

    company_uuid = models.UUIDField(db_index=True, null=True)
    branch_id = models.UUIDField(db_index=True, null=True)
    
    vehicle = models.ForeignKey(Vehicle, on_delete=models.SET_NULL, null=True)
    driver_uuid = models.UUIDField(help_text="Assigned driver for this route", null=True)
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PLANNED')
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Route {self.id} - {self.status}"

class Shipment(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('PACKED', 'Packed'),
        ('SHIPPED', 'Shipped'), # Assigned to a route
        ('OUT_FOR_DELIVERY', 'Out for Delivery'),
        ('DELIVERED', 'Delivered'),
        ('RETURNED', 'Returned'),
        ('FAILED', 'Delivery Failed'),
    ]

    company_uuid = models.UUIDField(db_index=True, null=True)
    branch_id = models.UUIDField(db_index=True, null=True)
    
    tracking_number = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    # Link to POS Order
    order_uuid = models.UUIDField(db_index=True)
    
    destination_address = models.TextField()
    customer_name = models.CharField(max_length=255)
    customer_phone = models.CharField(max_length=50)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    route = models.ForeignKey(DeliveryRoute, on_delete=models.SET_NULL, null=True, blank=True, related_name='shipments')
    
    # Last Mile Delivery Fields
    proof_of_delivery = models.ImageField(upload_to='pod/', null=True, blank=True)
    signature = models.ImageField(upload_to='signatures/', null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    delivery_notes = models.TextField(null=True, blank=True)
    geo_location = models.JSONField(null=True, blank=True, help_text="{'lat': 0.0, 'lng': 0.0}")
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.tracking_number} - {self.status}"
