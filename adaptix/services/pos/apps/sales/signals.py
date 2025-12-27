from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Payment

@receiver(post_save, sender=Payment)
@receiver(post_delete, sender=Payment)
def update_order_totals(sender, instance, **kwargs):
    """Update Order totals whenever a payment is saved or deleted"""
    if instance.order:
        instance.order.update_payment_status()
