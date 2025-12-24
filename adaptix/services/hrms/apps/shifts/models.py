import uuid
from django.db import models
from django.utils import timezone
from apps.employees.models import Employee

class Shift(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_uuid = models.UUIDField(db_index=True)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20)
    
    BRANCH_TYPE_CHOICES = (
        ('GENERAL', 'General'),
        ('FACTORY', 'Factory'),
        ('STORE', 'Store'),
        ('WAREHOUSE', 'Warehouse'),
    )
    branch_type = models.CharField(max_length=20, choices=BRANCH_TYPE_CHOICES, default='GENERAL')
    
    start_time = models.TimeField()
    end_time = models.TimeField()
    
    grace_time_in = models.PositiveIntegerField(default=15, help_text="Minutes allowed after start_time before marked late")
    grace_time_out = models.PositiveIntegerField(default=0, help_text="Minutes allowed before end_time (early leave)")
    
    is_overnight = models.BooleanField(default=False, help_text="If True, shift ends on the next day")
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('company_uuid', 'code')

    def __str__(self):
        return f"{self.name} ({self.start_time}-{self.end_time})"

class EmployeeShift(models.Model):
    """
    Roster management. Assigns a shift to an employee for a date range.
    For day-specific overrides, validation logic should check for overlaps.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_uuid = models.UUIDField(db_index=True)
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='shifts')
    shift = models.ForeignKey(Shift, on_delete=models.CASCADE, related_name='assignments')
    
    start_date = models.DateField(db_index=True)
    end_date = models.DateField(db_index=True, null=True, blank=True, help_text="If null, indefinitely assigned")
    
    assigned_by = models.UUIDField(null=True, blank=True, help_text="User UUID of supervisor")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['company_uuid', 'start_date', 'end_date']),
            models.Index(fields=['employee', 'start_date']),
        ]

    def __str__(self):
        return f"{self.employee} - {self.shift} ({self.start_date})"
