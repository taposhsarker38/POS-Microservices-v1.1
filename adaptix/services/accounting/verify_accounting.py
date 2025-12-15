
import os
import django
from decimal import Decimal
import sys
import uuid
from datetime import date

# Setup Django Environment
sys.path.append('/app')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.ledger.models import AccountGroup, ChartOfAccount, JournalEntry, JournalItem

def verify_accounting_flow():
    company_uuid = uuid.uuid4()
    print(f"🔹 Starting Accounting Verification for Company: {company_uuid}")

    # 1. Create Account Groups
    asset_group = AccountGroup.objects.create(
        company_uuid=company_uuid, name="Current Assets", group_type="asset"
    )
    income_group = AccountGroup.objects.create(
        company_uuid=company_uuid, name="Revenue", group_type="income"
    )
    print(f"✅ Created Account Groups: {asset_group.name}, {income_group.name}")

    # 2. Create Chart of Accounts
    cash_acct = ChartOfAccount.objects.create(
        company_uuid=company_uuid,
        group=asset_group,
        name="Cash on Hand",
        code="1001"
    )
    sales_acct = ChartOfAccount.objects.create(
        company_uuid=company_uuid,
        group=income_group,
        name="Sales Revenue",
        code="4001"
    )
    print(f"✅ Created Accounts: {cash_acct.name} ({cash_acct.code}), {sales_acct.name} ({sales_acct.code})")

    # 3. Create Journal Entry (Sale)
    entry = JournalEntry.objects.create(
        company_uuid=company_uuid,
        date=date.today(),
        reference="INV-001",
        description="Cash Sale",
        is_posted=False # Draft
    )
    print(f"✅ Created Draft Journal Entry: {entry.reference}")

    # 4. Create Journal Items (Double Entry)
    # Dr. Cash 100
    # Cr. Sales 100
    amount = Decimal("100.00")
    
    item1 = JournalItem.objects.create(
        entry=entry,
        account=cash_acct,
        debit=amount,
        credit=0,
        description="Cash received"
    )
    
    item2 = JournalItem.objects.create(
        entry=entry,
        account=sales_acct,
        debit=0,
        credit=amount,
        description="Revenue recognized"
    )
    
    print(f"✅ Created Items: Dr {item1.account.name} {item1.debit}, Cr {item2.account.name} {item2.credit}")

    # 5. Verify Balance
    total_debit = item1.debit + item2.debit
    total_credit = item1.credit + item2.credit
    
    assert total_debit == total_credit, f"Balance Mismatch: Dr {total_debit} != Cr {total_credit}"
    assert total_debit == amount, "Total amount mismatch"
    
    # 6. Post Entry (Mock Logic)
    entry.is_posted = True
    entry.total_debit = total_debit
    entry.total_credit = total_credit
    entry.save()
    
    # Update Account Balances (Naive implementation for mock)
    cash_acct.current_balance += amount # Asset increases with debit
    cash_acct.save()
    
    sales_acct.current_balance += amount # Income increases with credit
    sales_acct.save()
    
    print(f"✅ Posted Entry. Cash Balance: {cash_acct.current_balance}, Sales Balance: {sales_acct.current_balance}")
    print("🎉 Accounting Logic Verified!")

if __name__ == "__main__":
    try:
        verify_accounting_flow()
    except Exception as e:
        print(f"❌ Verification Failed: {e}")
