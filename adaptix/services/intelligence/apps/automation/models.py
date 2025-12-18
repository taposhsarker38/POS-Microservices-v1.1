import uuid
from django.db import models

class AutomationRule(models.Model):
    TRIGGER_CHOICES = (
        ('stock_level', 'Stock Level Change'),
        ('new_order', 'New Order'),
        ('payment_failed', 'Payment Failed'),
        ('shipment_status', 'Shipment Status Change'),
        ('scheduled', 'Scheduled Time'),
    )
    
    ACTION_CHOICES = (
        ('email', 'Send Email'),
        ('sms', 'Send SMS'),
        ('log', 'Log Alert'),
        ('webhook', 'Call Webhook'),
        ('create_task', 'Create Task'),
    )

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    
    trigger_type = models.CharField(max_length=50, choices=TRIGGER_CHOICES)
    
    # Simple Condition Logic: "field operator value" e.g. "quantity < 10"
    condition_field = models.CharField(max_length=100, blank=True, null=True)
    condition_operator = models.CharField(max_length=20, default='==') # ==, >, <, !=
    condition_value = models.CharField(max_length=255, blank=True, null=True)
    
    action_type = models.CharField(max_length=50, choices=ACTION_CHOICES)
    action_config = models.JSONField(default=dict, blank=True) # e.g. {"to": "admin@example.com", "body": "Low Stock!"}
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.trigger_type} -> {self.action_type})"

class ActionLog(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    rule = models.ForeignKey(AutomationRule, on_delete=models.CASCADE, related_name='logs')
    status = models.CharField(max_length=20, default='success') # success, failed
    details = models.TextField(blank=True)
    executed_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Log {self.id} - {self.rule.name}"
