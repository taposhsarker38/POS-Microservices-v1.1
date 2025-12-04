# services/auth/apps/auth/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.conf import settings
from apps.auth.models import Company, User  # adjust import path if different
from apps.core.events import publish_event

@receiver(post_save, sender=Company)
def company_post_save(sender, instance, created, **kwargs):
    data = {
        "id": str(getattr(instance, "uuid", instance.pk)),
        "name": instance.name,
        "code": instance.code,
        "tax_number": getattr(instance, "tax_number", None),
        "vat_rate": float(getattr(instance, "vat_rate", 0) or 0),
        "bin_number": getattr(instance, "bin_number", None),
        "address": getattr(instance, "address", None),
        "timezone": getattr(instance, "timezone", "UTC"),
    }
    event = "company.created" if created else "company.updated"
    publish_event(event, data, routing_key="company."+event.split(".")[-1])

@receiver(post_save, sender=User)
def user_post_save(sender, instance, created, **kwargs):
    # ensure the user has external id/uuid if necessary; here we use pk
    data = {
        "id": str(instance.pk),
        "username": instance.username,
        "email": instance.email,
        "company_uuid": str(getattr(instance.company, "uuid", instance.company_id)) if getattr(instance, "company", None) else None,
        "is_active": instance.is_active,
    }
    event = "user.created" if created else "user.updated"
    publish_event(event, data, routing_key="user."+event.split(".")[-1])
