from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import ProtectedError
from .models import AccountGroup, ChartOfAccount, JournalEntry, JournalItem, SystemAccount
from .serializers import (
    AccountGroupSerializer, ChartOfAccountSerializer, 
    JournalEntrySerializer, SystemAccountSerializer
)
from .report_services import ReportService

from django.db.models import Sum, Q, DecimalField, F
from django.db.models.functions import Coalesce, TruncMonth
from django.utils import timezone
from decimal import Decimal

class ProtectedModelViewSet(viewsets.ModelViewSet):
    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {"detail": "Cannot delete this item because it has associated transactions/records. Please delete or reassign those first."},
                status=status.HTTP_400_BAD_REQUEST
            )

class AccountGroupViewSet(ProtectedModelViewSet):
    queryset = AccountGroup.objects.all()
    serializer_class = AccountGroupSerializer

class ChartOfAccountViewSet(ProtectedModelViewSet):
    queryset = ChartOfAccount.objects.all()
    serializer_class = ChartOfAccountSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        company_uuid = self.request.query_params.get('company_uuid')
        wing_uuid = self.request.query_params.get('wing_uuid')
        
        if company_uuid:
            qs = qs.filter(company_uuid=company_uuid)
            
        if wing_uuid:
            # Annotate with branch-specific debits and credits
            qs = qs.annotate(
                branch_debit=Coalesce(Sum('journal_items__debit', filter=Q(journal_items__entry__wing_uuid=wing_uuid)), Decimal('0'), output_field=DecimalField()),
                branch_credit=Coalesce(Sum('journal_items__credit', filter=Q(journal_items__entry__wing_uuid=wing_uuid)), Decimal('0'), output_field=DecimalField())
            )

        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if start_date:
            qs = qs.filter(created_at__date__gte=start_date)
        if end_date:
            qs = qs.filter(created_at__date__lte=end_date)

        return qs.order_by('-created_at')

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['wing_uuid'] = self.request.query_params.get('wing_uuid')
        return context

    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        wing_uuid = request.query_params.get('wing_uuid')
        
        if wing_uuid:
            # If wing_uuid is provided, we adjust the data to show branch-specific balances
            # This is easier than complex serializer logic for many fields.
            results = response.data.get('results', response.data)
            instances = {str(obj.id): obj for obj in self.get_queryset()}
            
            for item in (results if isinstance(results, list) else []):
                obj = instances.get(item['id'])
                if obj:
                    group_type = obj.group.group_type.lower()
                    debits = getattr(obj, 'branch_debit', Decimal('0'))
                    credits = getattr(obj, 'branch_credit', Decimal('0'))
                    
                    if group_type in ['asset', 'expense']:
                        item['current_balance'] = str(obj.opening_balance + (debits - credits))
                    else:
                        item['current_balance'] = str(obj.opening_balance + (credits - debits))
        return response

class JournalEntryViewSet(ProtectedModelViewSet):
    queryset = JournalEntry.objects.all()
    serializer_class = JournalEntrySerializer

    def get_queryset(self):
        qs = super().get_queryset()
        company_uuid = self.request.query_params.get('company_uuid')
        wing_uuid = self.request.query_params.get('wing_uuid')
        voucher_type = self.request.query_params.get('voucher_type')
        
        if company_uuid:
            qs = qs.filter(company_uuid=company_uuid)
            
        if wing_uuid:
            qs = qs.filter(wing_uuid=wing_uuid)

        if voucher_type:
            qs = qs.filter(voucher_type=voucher_type)
            
        start_date = self.request.query_params.get('start_date')
        end_date = self.request.query_params.get('end_date')

        if start_date:
            qs = qs.filter(date__gte=start_date)
        if end_date:
            qs = qs.filter(date__lte=end_date)
            
        return qs.order_by('-date', '-created_at')

class BalanceSheetView(APIView):
    def get(self, request):
        company_uuid = request.query_params.get('company_uuid')
        wing_uuid = request.query_params.get('wing_uuid')
        as_of_date = request.query_params.get('date')

        if not company_uuid:
            return Response({"error": "company_uuid is required"}, status=400)

        # Pre-fetch all balances
        balance_map = ReportService.get_all_account_balances(
            company_uuid=company_uuid, 
            wing_uuid=wing_uuid, 
            as_of_date=as_of_date
        )

        # Consolidated report logic
        groups = AccountGroup.objects.filter(parent=None, company_uuid=company_uuid)

        data = {
            "asset": {"groups": [], "total": Decimal('0')},
            "liability": {"groups": [], "total": Decimal('0')},
            "equity": {"groups": [], "total": Decimal('0')},
        }
        
        for group in groups:
            group_total = self.calculate_group_total(group, wing_uuid, balance_map)
            group_data = {
                "name": group.name,
                "total": str(group_total),
                "type": group.group_type
            }
            
            main_type = group.group_type.lower()
            if main_type in data:
                data[main_type]["groups"].append(group_data)
                data[main_type]["total"] += group_total

        # Convert totals to string
        for key in data:
            data[key]["total"] = str(data[key]["total"])

        return Response(data)

    def calculate_group_total(self, group, wing_uuid, balance_map):
        total = Decimal('0')
        # 1. Direct accounts
        for acc in group.accounts.all():
            b = balance_map.get(acc.id, {})
            debits = b.get('cumulative_debit', Decimal('0'))
            credits = b.get('cumulative_credit', Decimal('0'))
            
            acc_opening = acc.opening_balance if not wing_uuid else Decimal('0')
            
            if group.group_type.lower() in ['asset', 'expense']:
                total += (acc_opening + debits - credits)
            else:
                total += (acc_opening + credits - debits)
        
        # 2. Subgroups recursion
        for sub in group.subgroups.all():
            total += self.calculate_group_total(sub, wing_uuid, balance_map)
            
        return total

class ProfitLossView(APIView):
    def get(self, request):
        company_uuid = request.query_params.get('company_uuid')
        wing_uuid = request.query_params.get('wing_uuid')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        if not company_uuid:
            return Response({"error": "company_uuid is required"}, status=400)

        # Pre-fetch all balances
        balance_map = ReportService.get_all_account_balances(
            company_uuid=company_uuid, 
            wing_uuid=wing_uuid, 
            as_of_date=end_date,
            start_date=start_date
        )

        # Consolidated report logic
        groups = AccountGroup.objects.filter(
            parent=None, 
            company_uuid=company_uuid
        ).filter(Q(group_type__iexact="income") | Q(group_type__iexact="expense"))

        data = {
            "income": {"groups": [], "total": Decimal('0')},
            "expense": {"groups": [], "total": Decimal('0')},
            "net_profit": Decimal('0')
        }
        
        for group in groups:
            g_type = group.group_type.lower()
            if g_type not in ["income", "expense"]:
                continue
                
            group_total = self.calculate_periodic_total(group, balance_map)
            group_data = {
                "name": group.name,
                "total": str(group_total),
            }
            
            data[g_type]["groups"].append(group_data)
            data[g_type]["total"] += group_total

        data["net_profit"] = data["income"]["total"] - data["expense"]["total"]
        
        # Format for response
        data["income"]["total"] = str(data["income"]["total"])
        data["expense"]["total"] = str(data["expense"]["total"])
        data["net_profit"] = str(data["net_profit"])

        return Response(data)

    def calculate_periodic_total(self, group, balance_map):
        total = Decimal('0')
        for acc in group.accounts.all():
            b = balance_map.get(acc.id, {})
            debits = b.get('periodic_debit', Decimal('0'))
            credits = b.get('periodic_credit', Decimal('0'))
            
            # For P&L, we don't use opening balances. We only track activity in the period.
            if group.group_type.lower() == 'expense':
                total += (debits - credits)
            else: # Income
                total += (credits - debits)
        
        for sub in group.subgroups.all():
            total += self.calculate_periodic_total(sub, balance_map)
            
        return total

class TrialBalanceView(APIView):
    def get(self, request):
        company_uuid = request.query_params.get('company_uuid')
        wing_uuid = request.query_params.get('wing_uuid')
        as_of_date = request.query_params.get('date')

        # Consolidated report logic
        acc_filter = Q()
        if company_uuid:
            acc_filter &= Q(company_uuid=company_uuid)
            
        accounts = ChartOfAccount.objects.filter(acc_filter)
        
        results = []
        total_debit = Decimal('0')
        total_credit = Decimal('0')

        for acc in accounts:
            items_qs = JournalItem.objects.filter(account=acc)
            if wing_uuid:
                items_qs = items_qs.filter(entry__wing_uuid=wing_uuid)
            if as_of_date:
                items_qs = items_qs.filter(entry__date__lte=as_of_date)
            
            debits = items_qs.aggregate(Sum('debit'))['debit__sum'] or Decimal('0')
            credits = items_qs.aggregate(Sum('credit'))['credit__sum'] or Decimal('0')
            
            # Opening balance integration
            acc_opening = acc.opening_balance if not wing_uuid else Decimal('0')
            group_type = acc.group.group_type.lower()
            
            balance = Decimal('0')
            if group_type in ['asset', 'expense']:
                balance = acc_opening + debits - credits
            else:
                balance = acc_opening + credits - debits
            
            item = {
                "id": str(acc.id),
                "name": acc.name,
                "code": acc.code,
                "debit": "0",
                "credit": "0"
            }
            
            if group_type in ['asset', 'expense']:
                if balance >= 0:
                    item["debit"] = str(balance)
                    total_debit += balance
                else:
                    item["credit"] = str(abs(balance))
                    total_credit += abs(balance)
            else:
                if balance >= 0:
                    item["credit"] = str(balance)
                    total_credit += balance
                else:
                    item["debit"] = str(abs(balance))
                    total_debit += abs(balance)

            if balance != 0:
                results.append(item)

        return Response({
            "accounts": results,
            "total_debit": str(total_debit),
            "total_credit": str(total_credit),
            "is_balanced": abs(total_debit - total_credit) < 0.01
        })

class AccountingDashboardView(APIView):
    def get(self, request):
        company_uuid = request.query_params.get('company_uuid')
        wing_uuid = request.query_params.get('wing_uuid')
        
        # Filter for Journal items
        item_filter = Q()
        if company_uuid:
            item_filter &= Q(entry__company_uuid=company_uuid)
        if wing_uuid:
            item_filter &= Q(entry__wing_uuid=wing_uuid)

        # 1. Income vs Expense Trend (Last 6 months)
        six_months_ago = timezone.now().date().replace(day=1) - timezone.timedelta(days=150)
        
        trend_data = {}
        monthly_qs = JournalItem.objects.filter(
            item_filter, 
            entry__date__gte=six_months_ago,
            account__group__group_type__in=['Income', 'Expense']
        ).annotate(
            month=TruncMonth('entry__date')
        )
        
        for item in monthly_qs:
            m_str = item.month.strftime('%b %Y')
            if m_str not in trend_data:
                trend_data[m_str] = {"month": m_str, "income": Decimal('0'), "expense": Decimal('0')}
            
            g_type = item.account.group.group_type.lower()
            if g_type == 'income':
                # Income: Credit - Debit
                trend_data[m_str]["income"] += (item.credit - item.debit)
            elif g_type == 'expense':
                # Expense: Debit - Credit
                trend_data[m_str]["expense"] += (item.debit - item.credit)

        trends = sorted(trend_data.values(), key=lambda x: timezone.datetime.strptime(x['month'], '%b %Y'))

        # 2. Asset Distribution
        # Use company_uuid filter for groups
        group_base = Q(parent=None, group_type__iexact='asset')
        if company_uuid:
            group_base &= Q(company_uuid=company_uuid)
        
        asset_groups = AccountGroup.objects.filter(group_base)
        assets_dist = []
        for g in asset_groups:
            bal = self.get_group_balance(g, wing_uuid)
            if bal > 0:
                assets_dist.append({"name": g.name, "value": float(bal)})

        # 3. Top 5 Expenses
        # Aggregate per account
        acc_base = Q(group__group_type__iexact='expense')
        if company_uuid:
            acc_base &= Q(company_uuid=company_uuid)
            
        # We need a separate filter for the annotation because it's relative to ChartOfAccount,
        # but the aggregate filter inside Sum needs to be either relative to the related model
        # or prefixed with the relation name.
        ann_item_filter = Q()
        if company_uuid:
            ann_item_filter &= Q(journal_items__entry__company_uuid=company_uuid)
        if wing_uuid:
            ann_item_filter &= Q(journal_items__entry__wing_uuid=wing_uuid)

        expense_accounts = ChartOfAccount.objects.filter(acc_base).annotate(
            total_exp=Coalesce(Sum('journal_items__debit', filter=ann_item_filter), Decimal('0')) - 
                      Coalesce(Sum('journal_items__credit', filter=ann_item_filter), Decimal('0'))
        ).order_by('-total_exp')[:5]
        
        top_expenses = [{"name": acc.name, "value": float(acc.total_exp)} for acc in expense_accounts if acc.total_exp > 0]

        # 4. Cash Balance
        cash_base = Q(name__icontains='cash')
        if company_uuid:
            cash_base &= Q(company_uuid=company_uuid)
            
        cash_accounts = ChartOfAccount.objects.filter(cash_base)
        total_cash = Decimal('0')
        for acc in cash_accounts:
            items = JournalItem.objects.filter(item_filter, account=acc)
            debits = items.aggregate(Sum('debit'))['debit__sum'] or Decimal('0')
            credits = items.aggregate(Sum('credit'))['credit__sum'] or Decimal('0')
            # Only add opening balance if viewing unit-level (no wing filter)
            opening = acc.opening_balance if not wing_uuid else Decimal('0')
            total_cash += (opening + debits - credits)

        return Response({
            "trends": trends,
            "assets_distribution": assets_dist,
            "top_expenses": top_expenses,
            "cash_balance": str(total_cash)
        })

    def get_group_balance(self, group, wing_uuid):
        total = Decimal('0')
        for acc in group.accounts.all():
            items_qs = JournalItem.objects.filter(account=acc)
            if wing_uuid:
                items_qs = items_qs.filter(entry__wing_uuid=wing_uuid)
            debits = items_qs.aggregate(Sum('debit'))['debit__sum'] or Decimal('0')
            credits = items_qs.aggregate(Sum('credit'))['credit__sum'] or Decimal('0')
            acc_opening = acc.opening_balance if not wing_uuid else Decimal('0')
            total += (acc_opening + debits - credits)
        for sub in group.subgroups.all():
            total += self.get_group_balance(sub, wing_uuid)
        return total

class SystemAccountViewSet(viewsets.ModelViewSet):
    queryset = SystemAccount.objects.all()
    serializer_class = SystemAccountSerializer
    filterset_fields = ['company_uuid', 'purpose']

    def perform_create(self, serializer):
        # Allow updating existing purpose mapping for the same company
        company_uuid = self.request.data.get('company_uuid')
        purpose = self.request.data.get('purpose')
        
        SystemAccount.objects.filter(
            company_uuid=company_uuid, 
            purpose=purpose
        ).delete()
        
        serializer.save()
