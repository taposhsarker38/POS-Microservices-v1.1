from django.db import models

class InventoryOptimization(models.Model):
    product_uuid = models.UUIDField()
    branch_id = models.UUIDField(null=True, blank=True)
    current_stock = models.IntegerField()
    avg_daily_consumption = models.FloatField()
    suggested_reorder_point = models.IntegerField()
    suggested_reorder_qty = models.IntegerField()
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['product_uuid', 'branch_id']),
        ]
