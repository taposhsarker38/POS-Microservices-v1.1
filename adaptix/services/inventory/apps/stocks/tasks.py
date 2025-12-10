from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import Batch, Stock
from apps.utils.notifications import NotificationService

@shared_task
def check_stock_expiry():
    """
    Runs daily to warn about expiring batches.
    """
    threshold_date = timezone.now().date() + timedelta(days=7)
    expiring_batches = Batch.objects.filter(
        expiry_date__lte=threshold_date,
        expiry_date__gte=timezone.now().date(),
        quantity__gt=0
    )

    notify = NotificationService()
    
    for batch in expiring_batches:
        notify.send_notification(
            event_type="stock.expiry_warning",
            data={
                "batch_number": batch.batch_number,
                "product_uuid": str(batch.stock.product_uuid),
                "expiry_date": str(batch.expiry_date),
                "quantity": float(batch.quantity)
            },
            rooms=[str(batch.company_uuid)] # Send to tenant room
        )
