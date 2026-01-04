import uuid
import random
from datetime import datetime, timedelta
from django.core.management.base import BaseCommand
from apps.ledger.models import JournalEntry, JournalItem, ChartOfAccount, AccountGroup, AccountingPeriod
from decimal import Decimal

class Command(BaseCommand):
    help = 'Simulates financial data with intentional anomalies for AI testing.'

    def handle(self, *args, **options):
        self.stdout.write("Starting Finance Simulation...")
        
        # 1. Ensure we have a company and period
        company_uuid = uuid.UUID('00000000-0000-0000-0000-000000000001') # Demo Company
        
        period, _ = AccountingPeriod.objects.get_or_create(
            company_uuid=company_uuid,
            name="Q1 2026",
            defaults={'start_date': '2026-01-01', 'end_date': '2026-03-31'}
        )

        # 2. Get or create accounts
        expense_group, _ = AccountGroup.objects.get_or_create(
            company_uuid=company_uuid, name="Operating Expenses", group_type="expense"
        )
        cash_group, _ = AccountGroup.objects.get_or_create(
            company_uuid=company_uuid, name="Current Assets", group_type="asset"
        )

        office_rent, _ = ChartOfAccount.objects.get_or_create(
            company_uuid=company_uuid, group=expense_group, name="Office Rent", code="6001"
        )
        marketing, _ = ChartOfAccount.objects.get_or_create(
            company_uuid=company_uuid, group=expense_group, name="Marketing", code="6002"
        )
        cash, _ = ChartOfAccount.objects.get_or_create(
            company_uuid=company_uuid, group=cash_group, name="Petty Cash", code="1001"
        )

        # 3. Generate Normal Transactions
        for i in range(20):
            amount = Decimal(random.randint(100, 500))
            date = datetime.now() - timedelta(days=random.randint(1, 20))
            
            entry = JournalEntry.objects.create(
                company_uuid=company_uuid,
                date=date,
                reference=f"REF-{i}",
                description=f"Marketing spend {i}",
                total_debit=amount,
                total_credit=amount,
                is_posted=True
            )
            JournalItem.objects.create(entry=entry, account=marketing, debit=amount)
            JournalItem.objects.create(entry=entry, account=cash, credit=amount)

        # 4. Inject Anomalies
        # A. Statistical Outlier (Huge amount)
        outlier_amount = Decimal('8500.00')
        entry_out = JournalEntry.objects.create(
            company_uuid=company_uuid,
            date=datetime.now(),
            reference="AD-001",
            description="Emergency Marketing Burst",
            total_debit=outlier_amount,
            total_credit=outlier_amount,
            is_posted=True
        )
        JournalItem.objects.create(entry=entry_out, account=marketing, debit=outlier_amount)
        JournalItem.objects.create(entry=entry_out, account=cash, credit=outlier_amount)

        # B. Duplicate Entry (Same day, same account, same amount)
        dup_amount = Decimal('425.50')
        for i in range(2):
            entry_dup = JournalEntry.objects.create(
                company_uuid=company_uuid,
                date=datetime.now() - timedelta(days=2),
                reference=f"DUP-{i}",
                description="Stationary purchase",
                total_debit=dup_amount,
                total_credit=dup_amount,
                is_posted=True
            )
            JournalItem.objects.create(entry=entry_dup, account=marketing, debit=dup_amount)
            JournalItem.objects.create(entry=entry_dup, account=cash, credit=dup_amount)

        # C. Round Number High Value
        round_amount = Decimal('5000.00')
        entry_round = JournalEntry.objects.create(
            company_uuid=company_uuid,
            date=datetime.now() - timedelta(days=5),
            reference="RN-99",
            description="Misc",
            total_debit=round_amount,
            total_credit=round_amount,
            is_posted=True
        )
        JournalItem.objects.create(entry=entry_round, account=marketing, debit=round_amount)
        JournalItem.objects.create(entry=entry_round, account=cash, credit=round_amount)

        self.stdout.write(self.style.SUCCESS("Finance simulation completed successfully!"))
