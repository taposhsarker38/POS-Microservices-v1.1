import uuid
from django.db import models
from django.utils import timezone
from apps.employees.models import Employee

class Attendance(models.Model):
    STATUS_CHOICES = (
        ('present', 'Present'),
        ('absent', 'Absent'),
        ('late', 'Late'),
        ('half_day', 'Half Day'),
        ('leave', 'On Leave'),
    )

    METHOD_CHOICES = (
        ('manual', 'Manual'),
        ('biometric', 'Biometric Device'),
        ('app', 'Mobile App'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='attendance')
    date = models.DateField(default=timezone.now)
    
    check_in = models.TimeField(null=True, blank=True)
    check_out = models.TimeField(null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='present')
    
    # Advanced Tracking
    method = models.CharField(max_length=20, choices=METHOD_CHOICES, default='manual')
    device_id = models.CharField(max_length=100, blank=True, null=True)
    
    late_minutes = models.PositiveIntegerField(default=0)
    early_out_minutes = models.PositiveIntegerField(default=0)
    is_flexible = models.BooleanField(default=False, help_text="Copied from employee policy at time of punch")

    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def calculate_status(self):
        """Logic to calculate late/early minutes based on shift."""
        if self.employee.attendance_policy == 'FLEXIBLE':
            self.is_flexible = True
            self.status = 'present'
            self.late_minutes = 0
            self.early_out_minutes = 0
            return

        shift = self.employee.current_shift
        if not shift or not self.check_in:
            return

        from datetime import datetime
        combine = datetime.combine
        
        # Calculate Late Minutes
        check_in_dt = combine(self.date, self.check_in)
        shift_start_dt = combine(self.date, shift.start_time)
        
        diff_in = (check_in_dt - shift_start_dt).total_seconds() / 60
        if diff_in > shift.grace_time_in:
            self.late_minutes = int(diff_in)
            self.status = 'late'
        else:
            self.late_minutes = 0
            self.status = 'present'

        # Calculate Early Out Minutes
        if self.check_out:
            check_out_dt = combine(self.date, self.check_out)
            shift_end_dt = combine(self.date, shift.end_time)
            
            diff_out = (shift_end_dt - check_out_dt).total_seconds() / 60
            if diff_out > shift.grace_time_out:
                self.early_out_minutes = int(diff_out)
            else:
                self.early_out_minutes = 0

    def save(self, *args, **kwargs):
        self.calculate_status()
        super().save(*args, **kwargs)

    class Meta:
        unique_together = ('employee', 'date')

    def __str__(self):
        return f"{self.employee} - {self.date} ({self.status})"
