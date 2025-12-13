from django.db import models

class CustomerSegmentation(models.Model):
    customer_email = models.EmailField() # Linking by email for now as UUID might vary across services if not synced
    recency = models.IntegerField(help_text="Days since last purchase")
    frequency = models.IntegerField(help_text="Total number of orders")
    monetary = models.DecimalField(max_digits=12, decimal_places=2, help_text="Total spend")
    r_score = models.IntegerField()
    f_score = models.IntegerField()
    m_score = models.IntegerField()
    segment_label = models.CharField(max_length=50) # VIP, Loyal, At-Risk, etc.
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['customer_email']),
            models.Index(fields=['segment_label']),
        ]
