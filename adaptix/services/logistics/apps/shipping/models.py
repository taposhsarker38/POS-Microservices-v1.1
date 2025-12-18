from django.db import models
import uuid

class Vehicle(models.Model):
    STATUS_CHOICES = [
        ('AVAILABLE', 'Available'),
        ('IN_TRANSIT', 'In Transit'),
        ('MAINTENANCE', 'Maintenance'),
    ]
    
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
        ('DELIVERED', 'Delivered'),
        ('RETURNED', 'Returned'),
    ]

    tracking_number = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    # Link to POS Order
    order_uuid = models.UUIDField(db_index=True)
    
    destination_address = models.TextField()
    customer_name = models.CharField(max_length=255)
    customer_phone = models.CharField(max_length=50)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING')
    route = models.ForeignKey(DeliveryRoute, on_delete=models.SET_NULL, null=True, blank=True, related_name='shipments')
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.tracking_number} - {self.status}"
