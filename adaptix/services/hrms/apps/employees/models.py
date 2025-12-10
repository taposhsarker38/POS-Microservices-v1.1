import uuid
from django.db import models
from django.utils import timezone

class Employee(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_uuid = models.UUIDField(db_index=True) # Multitenancy
    user_uuid = models.UUIDField(null=True, blank=True) # Link to Auth
    
    employee_code = models.CharField(max_length=50, blank=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    
    department = models.CharField(max_length=100, blank=True)
    designation = models.CharField(max_length=100, blank=True)
    
    joining_date = models.DateField(default=timezone.now)
    salary_basic = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"
