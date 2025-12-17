from django.db import models
from apps.employees.models import Employee
from django.conf import settings

class KPI(models.Model):
    """Definition of a Key Performance Indicator"""
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    target_value = models.DecimalField(max_digits=10, decimal_places=2, help_text="Numeric target value (e.g. 10000 sales)")
    unit = models.CharField(max_length=50, blank=True, help_text="e.g. USD, Units, Percentage")
    weightage = models.IntegerField(default=1, help_text="Importance weight (1-10)")
    active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title

class EmployeeKPI(models.Model):
    """Assigning a KPI to an Employee for a specific period"""
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='kpis')
    kpi = models.ForeignKey(KPI, on_delete=models.CASCADE)
    period_start = models.DateField()
    period_end = models.DateField()
    assigned_target = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Override standard target if needed")
    achieved_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, help_text="Calculated score")
    
    class Meta:
        unique_together = ['employee', 'kpi', 'period_start']

    def __str__(self):
        return f"{self.employee} - {self.kpi}"

class PerformanceReview(models.Model):
    """Periodic Review (e.g. Annual Appraisal)"""
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='reviews')
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='reviews_given')
    review_date = models.DateField()
    period_name = models.CharField(max_length=100, help_text="e.g. Annual 2024, Q1 2025")
    rating = models.IntegerField(choices=[(1, 'Poor'), (2, 'Needs Improvement'), (3, 'Satisfactory'), (4, 'Good'), (5, 'Excellent')])
    comments = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.employee} - {self.period_name}"

class Promotion(models.Model):
    """Track designation changes"""
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='promotions')
    previous_designation = models.CharField(max_length=255)
    new_designation = models.CharField(max_length=255)
    promotion_date = models.DateField()
    reason = models.TextField(blank=True)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

    def __str__(self):
        return f"{self.employee}: {self.previous_designation} -> {self.new_designation}"

class Increment(models.Model):
    """Track salary changes"""
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='increments')
    previous_salary = models.DecimalField(max_digits=12, decimal_places=2)
    new_salary = models.DecimalField(max_digits=12, decimal_places=2)
    increment_date = models.DateField()
    increment_amount = models.DecimalField(max_digits=12, decimal_places=2, help_text="Difference")
    percentage = models.DecimalField(max_digits=5, decimal_places=2, help_text="% Increase")
    reason = models.TextField(blank=True)
    approved_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)

    def save(self, *args, **kwargs):
        if not self.increment_amount:
            self.increment_amount = self.new_salary - self.previous_salary
        if not self.percentage and self.previous_salary > 0:
            self.percentage = (self.increment_amount / self.previous_salary) * 100
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.employee}: {self.previous_salary} -> {self.new_salary}"
