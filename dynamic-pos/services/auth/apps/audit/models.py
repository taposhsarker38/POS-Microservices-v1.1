from django.db import models
from django.conf import settings

class AuditLog(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL)
    path = models.CharField(max_length=400)
    method = models.CharField(max_length=10)
    status_code = models.PositiveSmallIntegerField()
    request_body = models.TextField(blank=True)
    response_body = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    ip = models.CharField(max_length=64, blank=True, null=True)
    user_agent = models.CharField(max_length=512, blank=True, null=True)
    def __str__(self):
        return f"{self.created_at} {self.method} {self.path}"
