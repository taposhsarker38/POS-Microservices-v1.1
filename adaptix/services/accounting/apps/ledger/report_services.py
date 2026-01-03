from decimal import Decimal
from django.db.models import Sum, Q
from .models import ChartOfAccount, JournalItem
from .utils import get_tenant_unit_ids

class ReportService:
    @staticmethod
    def get_all_account_balances(company_uuid, wing_uuid=None, as_of_date=None, start_date=None):
        """
        Fetches balances for all accounts of a company in bulk to avoid N+1 queries.
        Returns a dictionary mapping account UUID to its calculated balance.
        """
        # 1. Base filter for Journal Items
        item_filter = Q()
        if company_uuid:
            company_ids = get_tenant_unit_ids(company_uuid)
            item_filter &= Q(entry__company_uuid__in=company_ids)
            
        if wing_uuid:
            item_filter &= Q(entry__wing_uuid=wing_uuid)
        
        # 2. Add time filters
        as_of_filter = Q(item_filter)
        if as_of_date:
            as_of_filter &= Q(entry__date__lte=as_of_date)
            
        periodic_filter = Q(item_filter)
        if start_date:
            periodic_filter &= Q(entry__date__gte=start_date)
        if as_of_date:
            periodic_filter &= Q(entry__date__lte=as_of_date)

        # 3. Aggregate everything in one or two queries
        # Query 1: Cumulative balances (for Balance Sheet and Trial Balance)
        cumulative_totals = JournalItem.objects.filter(as_of_filter).values('account_id').annotate(
            total_debit=Sum('debit'),
            total_credit=Sum('credit')
        )
        
        # Query 2: Periodic activity (for Profit & Loss)
        periodic_totals = JournalItem.objects.filter(periodic_filter).values('account_id').annotate(
            total_debit=Sum('debit'),
            total_credit=Sum('credit')
        )

        balances = {}
        
        # Helper to initialize balance object
        def get_blank():
            return {
                'cumulative_debit': Decimal('0'), 
                'cumulative_credit': Decimal('0'),
                'periodic_debit': Decimal('0'), 
                'periodic_credit': Decimal('0')
            }

        for row in cumulative_totals:
            acc_id = row['account_id']
            if acc_id not in balances: balances[acc_id] = get_blank()
            balances[acc_id]['cumulative_debit'] = row['total_debit'] or Decimal('0')
            balances[acc_id]['cumulative_credit'] = row['total_credit'] or Decimal('0')

        for row in periodic_totals:
            acc_id = row['account_id']
            if acc_id not in balances: balances[acc_id] = get_blank()
            balances[acc_id]['periodic_debit'] = row['total_debit'] or Decimal('0')
            balances[acc_id]['periodic_credit'] = row['total_credit'] or Decimal('0')
            
        return balances
