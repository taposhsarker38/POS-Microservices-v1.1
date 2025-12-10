import uuid
from decimal import Decimal
from django.db import models
from django.db import transaction, connection
from django.utils import timezone
from .business_types import BUSINESS_TYPE_CHOICES, DEFAULT_FEATURES, FMCG

class Company(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    auth_company_uuid = models.UUIDField(unique=True, db_index=True)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50)
    business_type = models.CharField(max_length=50, choices=BUSINESS_TYPE_CHOICES, default=FMCG)
    tax_number = models.CharField(max_length=128, blank=True, null=True)
    vat_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    bin_number = models.CharField(max_length=128, blank=True, null=True)
    accounting_codes = models.JSONField(default=dict, blank=True)
    default_payment_terms = models.CharField(max_length=255, blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    timezone = models.CharField(max_length=50, default='UTC')
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        if is_new:
            # Create default settings with features based on business type
            features = DEFAULT_FEATURES.get(self.business_type, [])
            # Convert list to dict for easier frontend checking e.g. {"pos": True}
            feature_flags = {f: True for f in features}
            
            CompanySetting.objects.create(
                company=self,
                feature_flags=feature_flags,
                ui_schema={} # Can be populated dynamically too
            )

    class Meta:
        indexes = [models.Index(fields=["auth_company_uuid"])]

    def __str__(self):
        return self.name

class NavigationItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, related_name='nav_items', on_delete=models.CASCADE)
    parent = models.ForeignKey('self', null=True, blank=True, related_name='children', on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    path = models.CharField(max_length=400, blank=True, null=True)
    order = models.IntegerField(default=0)
    permission_code = models.CharField(max_length=200, blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order']

    def __str__(self):
        return f"{self.company_id} - {self.title}"

class CompanySetting(models.Model):
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name='settings')
    primary_color = models.CharField(max_length=7, blank=True, null=True)
    secondary_color = models.CharField(max_length=7, blank=True, null=True)
    accent_color = models.CharField(max_length=7, blank=True, null=True)
    background_color = models.CharField(max_length=7, blank=True, null=True)
    text_color = models.CharField(max_length=7, blank=True, null=True)
    logo = models.CharField(max_length=255, blank=True, null=True)
    favicon = models.CharField(max_length=255, blank=True, null=True)
    nav = models.JSONField(default=list, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    feature_flags = models.JSONField(default=dict, blank=True)
    ui_schema = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

class Wing(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, related_name='wings', on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50)
    pos_printer_name = models.CharField(max_length=255, blank=True, null=True)
    pos_config = models.JSONField(default=dict, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('company', 'code')

    def __str__(self):
        return f"{self.company.code} - {self.name}"

class Currency(models.Model):
    code = models.CharField(max_length=3, unique=True)
    name = models.CharField(max_length=64)
    symbol = models.CharField(max_length=8, blank=True)
    exchange_rate = models.DecimalField(max_digits=20, decimal_places=8, default=Decimal('1.0'))
    is_base = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_base", "code"]

    def save(self, *args, **kwargs):
        if self.is_base:
            Currency.objects.filter(is_base=True).exclude(pk=self.pk).update(is_base=False)
            self.exchange_rate = Decimal('1.0')
        super().save(*args, **kwargs)

INVOICE_TEMPLATE_CHOICES = (
    ("standard", "Standard"),
    ("compact", "Compact"),
    ("detailed", "Detailed"),
)

class InvoiceSettings(models.Model):
    company = models.OneToOneField(Company, on_delete=models.CASCADE, related_name="invoice_settings")
    invoice_prefix = models.CharField(max_length=20, blank=True, default="INV")
    next_invoice_number = models.BigIntegerField(default=1)
    allow_negative_stock = models.BooleanField(default=False)
    tax_inclusive = models.BooleanField(default=False)
    default_currency = models.ForeignKey(Currency, null=True, blank=True, on_delete=models.SET_NULL)
    template = models.CharField(max_length=32, choices=INVOICE_TEMPLATE_CHOICES, default="standard")
    footer_note = models.TextField(blank=True)
    sequence_name = models.CharField(max_length=128, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def allocate_invoice_number_via_sequence(self):
        if not self.sequence_name:
            raise RuntimeError("No sequence configured")
        with connection.cursor() as cursor:
            cursor.execute('SELECT nextval(%s)', [self.sequence_name])
            row = cursor.fetchone()
        seqval = int(row[0])
        self.next_invoice_number = seqval + 1
        self.save(update_fields=["next_invoice_number"])
        return f"{self.invoice_prefix}-{seqval:08d}"

    def allocate_invoice_number_via_lock(self):
        with transaction.atomic():
            locked = InvoiceSettings.objects.select_for_update().get(pk=self.pk)
            invoice_no = f"{locked.invoice_prefix}-{locked.next_invoice_number:08d}"
            locked.next_invoice_number += 1
            locked.save(update_fields=["next_invoice_number"])
        return invoice_no

    def allocate_invoice_number(self):
        if connection.vendor == 'postgresql' and self.sequence_name:
            return self.allocate_invoice_number_via_sequence()
        return self.allocate_invoice_number_via_lock()


# -----------------------------------------------------------------------------
# HRMS Models
# -----------------------------------------------------------------------------
class Department(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="departments")
    name = models.CharField(max_length=120)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('company', 'name')
    
    def __str__(self):
        return self.name

class Designation(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="designations")
    name = models.CharField(max_length=120)
    rank = models.PositiveIntegerField(default=1, help_text="1 is highest")
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('company', 'name')
        ordering = ['rank']

    def __str__(self):
        return self.name

# -----------------------------------------------------------------------------
# Accounting Models (Simple Chart of Accounts)
# -----------------------------------------------------------------------------
class AccountGroup(models.Model):
    """Assets, Liabilities, Income, Expenses, Equity"""
    GROUP_TYPES = (
        ("asset", "Asset"),
        ("liability", "Liability"),
        ("equity", "Equity"),
        ("income", "Income"),
        ("expense", "Expense"),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="account_groups")
    name = models.CharField(max_length=120)
    code = models.CharField(max_length=20, blank=True, null=True) # e.g. 1000
    group_type = models.CharField(max_length=20, choices=GROUP_TYPES)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='subgroups')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.code} {self.name}"

class ChartOfAccount(models.Model):
    """Specific Ledgers e.g. Cash, Sales"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="accounts")
    group = models.ForeignKey(AccountGroup, on_delete=models.PROTECT, related_name="accounts")
    name = models.CharField(max_length=120)
    code = models.CharField(max_length=20, blank=True, null=True) # e.g. 1001
    opening_balance = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    current_balance = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('company', 'code')
        ordering = ['code']

    def __str__(self):
        return f"{self.code} - {self.name}"

# -----------------------------------------------------------------------------
# Employee Model (Updated)
# -----------------------------------------------------------------------------
class Employee(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company = models.ForeignKey(Company, on_delete=models.CASCADE, related_name="employees")
    user_uuid = models.UUIDField(null=True, blank=True, help_text="Link to Auth Service User UUID")
    
    # HR Linkages
    department = models.ForeignKey(Department, null=True, blank=True, on_delete=models.SET_NULL, related_name="employees")
    designation = models.ForeignKey(Designation, null=True, blank=True, on_delete=models.SET_NULL, related_name="employees")
    manager = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name="subordinates")

    employee_code = models.CharField(max_length=30, blank=True, null=True)
    first_name = models.CharField(max_length=120)
    last_name = models.CharField(max_length=120, blank=True)
    email = models.EmailField(blank=True, null=True, db_index=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    
    # HR Details
    date_of_birth = models.DateField(null=True, blank=True)
    joining_date = models.DateField(null=True, blank=True)
    salary = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    
    is_active = models.BooleanField(default=True)
    date_joined = models.DateTimeField(default=timezone.now)
    photo = models.CharField(max_length=255, null=True, blank=True)

    class Meta:
        ordering = ["-date_joined", "employee_code"]
    
    def __str__(self):
        return f"{self.first_name} {self.last_name}"

