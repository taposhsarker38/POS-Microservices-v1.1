import uuid
from django.db import models

class FinancialAnomaly(models.Model):
    """
    Stores detected financial anomalies from accounting journals.
    """
    SEVERITY_CHOICES = (
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
        ('critical', 'Critical'),
    )
    
    ANOMALY_TYPES = (
        ('statistical_outlier', 'Statistical Outlier'),
        ('duplicate_entry', 'Duplicate Entry'),
        ('round_number', 'High Round Number'),
        ('unusual_velocity', 'Unusual Velocity'),
        ('unmatched_entry', 'Unmatched/Suspicious Entry'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_uuid = models.UUIDField(db_index=True)
    
    # Reference to external data (JournalEntry ID from accounting service)
    journal_entry_id = models.UUIDField(db_index=True)
    journal_date = models.DateField()
    journal_reference = models.CharField(max_length=100, blank=True)
    amount = models.DecimalField(max_digits=20, decimal_places=2)
    category = models.CharField(max_length=100, blank=True)
    
    anomaly_type = models.CharField(max_length=50, choices=ANOMALY_TYPES)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default='medium')
    risk_score = models.FloatField(default=0.0) # 0.0 to 1.0
    
    reasoning = models.TextField()
    is_resolved = models.BooleanField(default=False)
    resolution_note = models.TextField(blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.UUIDField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name_plural = "Financial Anomalies"
        ordering = ['-risk_score', '-created_at']

    def __str__(self):
        return f"{self.anomaly_type} - {self.amount} ({self.severity})"
