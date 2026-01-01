import uuid
from decimal import Decimal
from django.db import models
from django.db.models import Sum
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver

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
    wing_uuid = models.UUIDField(db_index=True, null=True, blank=True)
    name = models.CharField(max_length=120)
    code = models.CharField(max_length=20, blank=True)
    group_type = models.CharField(max_length=20, choices=GROUP_TYPES)
    parent = models.ForeignKey('self', null=True, blank=True, on_delete=models.CASCADE, related_name='subgroups')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.code} {self.name}"

class ChartOfAccount(models.Model):
    """
    Specific Ledger: 'Cash', 'Sales Revenue', 'Rent Expense'.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_uuid = models.UUIDField(db_index=True)
    wing_uuid = models.UUIDField(db_index=True, null=True, blank=True)
    group = models.ForeignKey(AccountGroup, on_delete=models.PROTECT, related_name="accounts")
    name = models.CharField(max_length=120)
    code = models.CharField(max_length=20) 
    
    opening_balance = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    current_balance = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('company_uuid', 'code')

    def __str__(self):
        return f"{self.code} - {self.name}"

class JournalEntry(models.Model):
    """
    Head of a transaction. e.g. "Invoice #123"
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    company_uuid = models.UUIDField(db_index=True)
    wing_uuid = models.UUIDField(db_index=True, null=True, blank=True)
    date = models.DateField()
    reference = models.CharField(max_length=100, blank=True) # e.g. Invoice Number
    description = models.TextField(blank=True)
    
    total_debit = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    total_credit = models.DecimalField(max_digits=20, decimal_places=2, default=0)
    
    posted_by = models.UUIDField(null=True, blank=True)
    is_posted = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

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
        super().save(*args, **kwargs)

def recalculate_account_balance(account):
    totals = JournalItem.objects.filter(account=account).aggregate(
        total_debit=Sum('debit'),
        total_credit=Sum('credit')
    )
    
    debits = totals.get('total_debit') or Decimal('0')
    credits = totals.get('total_credit') or Decimal('0')
    
    # Logic based on Accounting Equation
    group_type = account.group.group_type.lower()
    
    if group_type in ['asset', 'expense']:
        account.current_balance = account.opening_balance + (debits - credits)
    else:
        # Liability, Equity, Income
        account.current_balance = account.opening_balance + (credits - debits)
    
    account.save(update_fields=['current_balance'])

@receiver(post_save, sender=JournalItem)
@receiver(post_delete, sender=JournalItem)
def on_journal_item_change(sender, instance, **kwargs):
    recalculate_account_balance(instance.account)

@receiver(post_save, sender=ChartOfAccount)
def on_account_save(sender, instance, created, **kwargs):
    # If opening balance changed or account created, we need to refresh current balance.
    # To avoid recursion, we check if it was called via recalculate_account_balance (update_fields)
    if 'update_fields' in kwargs and kwargs['update_fields'] and 'current_balance' in kwargs['update_fields']:
        return
    
    # Recalculate
    recalculate_account_balance(instance)
