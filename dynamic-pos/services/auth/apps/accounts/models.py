import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.utils import timezone
class Company(models.Model):
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=64, unique=True)
    tax_number = models.CharField(max_length=128, blank=True, null=True)
    vat_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    bin_number = models.CharField(max_length=128, blank=True, null=True)
    accounting_codes = models.JSONField(default=dict, blank=True)  # mapping: {"sales":"4000", "cogs":"5000"}
    default_payment_terms = models.CharField(max_length=255, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    timezone = models.CharField(max_length=64, default="UTC")
    def __str__(self):
        return self.name
class Permission(models.Model):
    codename = models.CharField(max_length=128, unique=True)
    name = models.CharField(max_length=255)
    def __str__(self):
        return self.codename
class Role(models.Model):
    name = models.CharField(max_length=128)
    permissions = models.ManyToManyField(Permission, blank=True)
    company = models.ForeignKey(Company, null=True, blank=True, on_delete=models.CASCADE)
    def __str__(self):
        return self.name
class User(AbstractUser):
    company = models.ForeignKey(Company, null=True, blank=True, on_delete=models.CASCADE)
    is_terminal = models.BooleanField(default=False)
    roles = models.ManyToManyField(Role, blank=True, related_name="users")
    email = models.EmailField(unique=True)
    email_verified = models.BooleanField(default=False)
    verify_email_token = models.CharField(max_length=255, blank=True, null=True)
    def __str__(self):
        return self.username

class Menu(models.Model):
    title = models.CharField(max_length=200)
    path = models.CharField(max_length=200, blank=True, null=True)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='children')
    permission = models.ForeignKey(Permission, null=True, blank=True, on_delete=models.SET_NULL)
    order = models.PositiveSmallIntegerField(default=0)
    icon = models.CharField(max_length=100, blank=True, null=True)
    def __str__(self):
        return self.title