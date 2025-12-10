import uuid
from decimal import Decimal
from django.db import models

class AccountGroup(models.Model):
    """
    Groups accounts: Assets, Liabilities, Equity, Income, Expenses.
    Heirarchical: 'Current Assets' -> 'Cash in Hand'.
    """
    GROUP_TYPES = (
        ("asset", "Asset"),
        ("liability", "Liability"),
        ("equity", "Equity"),
        ("income", "Income"),
        ("expense", "Expense"),
    )
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_uuid = models.UUIDField(db_index=True)
    name = models.CharField(max_length=120)
    code = models.CharField(max_length=20, blank=True)
    group_type = models.CharField(max_length=20, choices=GROUP_TYPES)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='subgroups')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.code} {self.name}"

class ChartOfAccount(models.Model):
    """
    Specific Ledger: 'Cash', 'Sales Revenue', 'Rent Expense'.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_uuid = models.UUIDField(db_index=True)
    group = models.ForeignKey(AccountGroup, on_delete=models.PROTECT, related_name="accounts")
    name = models.CharField(max_length=120)
    code = models.CharField(max_length=20, unique=True) 
    
    opening_balance = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    current_balance = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.code} - {self.name}"

class JournalEntry(models.Model):
    """
    Head of a transaction. e.g. "Invoice #123"
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_uuid = models.UUIDField(db_index=True)
    date = models.DateField()
    reference = models.CharField(max_length=100, blank=True) # e.g. Invoice Number
    description = models.TextField(blank=True)
    
    total_debit = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    total_credit = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    
    posted_by = models.UUIDField(null=True)
    created_at = models.DateTimeField(auto_now_add=True)

class JournalItem(models.Model):
    """
    Line item: Debit Cash $100, Credit Sales $100.
    """
    entry = models.ForeignKey(JournalEntry, on_delete=models.CASCADE, related_name='items')
    account = models.ForeignKey(ChartOfAccount, on_delete=models.PROTECT, related_name='journal_items')
    
    debit = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    credit = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    
    description = models.CharField(max_length=255, blank=True)

    def save(self, *args, **kwargs):
        # Update account balance logic would go here in a signal or service method
        super().save(*args, **kwargs)
