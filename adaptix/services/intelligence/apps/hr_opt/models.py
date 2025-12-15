from django.db import models

class AttritionPrediction(models.Model):
    employee_uuid = models.UUIDField(unique=True)
    risk_score = models.FloatField(help_text="Probability of leaving (0-1)")
    risk_level = models.CharField(max_length=20) # Low, Medium, High
    avg_monthly_hours = models.IntegerField(null=True)
    absenteeism_rate = models.FloatField(null=True)
    last_evaluation = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['risk_level']),
        ]
