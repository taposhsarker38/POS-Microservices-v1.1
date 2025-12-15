from django.db import models

class SalesForecast(models.Model):
    date = models.DateField()
    predicted_sales = models.FloatField()
    confidence_lower = models.FloatField(null=True)
    confidence_upper = models.FloatField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['date']),
        ]
