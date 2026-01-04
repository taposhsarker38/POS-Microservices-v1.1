import uuid
from django.db import models

class MaintenanceAnomaly(models.Model):
    """
    Stores AI-detected anomalies and maintenance predictions.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_uuid = models.UUIDField(db_index=True)
    asset_id = models.UUIDField(db_index=True)
    
    analysis_date = models.DateTimeField(auto_now_add=True)
    
    # Prediction Metrics
    risk_score = models.IntegerField(default=0, help_text="0-100 risk of failure")
    failure_probability = models.DecimalField(max_digits=5, decimal_places=4, default=0.0)
    estimated_remaining_life_weeks = models.IntegerField(null=True, blank=True)
    
    # Anomaly Details
    anomaly_type = models.CharField(max_length=50, blank=True) # "Temperature Spike", "Vibration Pattern"
    reasoning = models.TextField()
    
    is_resolved = models.BooleanField(default=False)
    maintenance_task_id = models.UUIDField(null=True, blank=True, help_text="Linked task in Asset service")

    class Meta:
        ordering = ['-analysis_date']
        verbose_name_plural = "Maintenance Anomalies"

    def __str__(self):
        return f"Anomaly for {self.asset_id} - Score: {self.risk_score}"
