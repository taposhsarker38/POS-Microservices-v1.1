import uuid
from django.db import models
from django.utils import timezone

class Department(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_uuid = models.UUIDField(db_index=True)
    name = models.CharField(max_length=120)
    code = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('company_uuid', 'name')

    def __str__(self):
        return self.name

class Designation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_uuid = models.UUIDField(db_index=True)
    name = models.CharField(max_length=120)
    rank = models.PositiveIntegerField(default=1, help_text="1 is highest/senior-most")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('company_uuid', 'name')
        ordering = ['rank']

    def __str__(self):
        return self.name

class AttributeSet(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_uuid = models.UUIDField(db_index=True)
    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('company_uuid', 'name')
    
    def __str__(self):
        return self.name

class Attribute(models.Model):
    ATTRIBUTE_TYPE_CHOICES = (
        ('text', 'Text'),
        ('number', 'Number'),
        ('date', 'Date'),
        ('select', 'Select'),
        ('boolean', 'Yes/No'),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_uuid = models.UUIDField(db_index=True)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=100)
    type = models.CharField(max_length=20, choices=ATTRIBUTE_TYPE_CHOICES, default='text')
    options = models.JSONField(default=list, blank=True)
    is_required = models.BooleanField(default=False)
    
    attribute_set = models.ForeignKey(AttributeSet, on_delete=models.CASCADE, related_name='attributes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('company_uuid', 'attribute_set', 'code')

    def __str__(self):
        return f"{self.name} ({self.attribute_set.name})"

class Employee(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_uuid = models.UUIDField(db_index=True) # Multitenancy
    user_uuid = models.UUIDField(null=True, blank=True, db_index=True) # Link to Auth

    employee_code = models.CharField(max_length=50, db_index=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    email = models.EmailField(unique=True)
    phone = models.CharField(max_length=20, blank=True)
    gender = models.CharField(max_length=10, choices=[('MALE', 'Male'), ('FEMALE', 'Female'), ('OTHER', 'Other')], null=True, blank=True)

    # Normalized Foreign Keys for filtering
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='employees')
    designation = models.ForeignKey(Designation, on_delete=models.SET_NULL, null=True, blank=True, related_name='employees')
    
    # Hierarchy & Location
    reporting_to = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='subordinates')
    branch_uuid = models.UUIDField(null=True, blank=True, db_index=True, help_text="Specific Branch/Subsidiary UUID")
    
    # Work Timing
    current_shift = models.ForeignKey('shifts.Shift', on_delete=models.SET_NULL, null=True, blank=True, related_name='employees')

    joining_date = models.DateField(default=timezone.now)
    salary_basic = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    is_active = models.BooleanField(default=True)
    
    # Dynamic Attributes
    attribute_set = models.ForeignKey(AttributeSet, on_delete=models.SET_NULL, null=True, blank=True)
    attributes = models.JSONField(default=dict, blank=True) 

    created_at = models.DateTimeField(auto_now_add=True)

    # Attendance Configuration
    ATTENDANCE_POLICY_CHOICES = [
        ('STRICT', 'Strict (Shift Based)'),
        ('FLEXIBLE', 'Flexible (One Punch)'),
        ('NONE', 'No Tracking'),
    ]
    attendance_policy = models.CharField(
        max_length=20, 
        choices=ATTENDANCE_POLICY_CHOICES, 
        default='STRICT',
        help_text="Determines how late/early status is calculated."
    )

    def __str__(self):
        return f"{self.first_name} {self.last_name}"
