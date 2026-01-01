from rest_framework import viewsets, status
from rest_framework.views import APIView
from rest_framework.response import Response
from django.db.models import ProtectedError
from .models import AccountGroup, ChartOfAccount, JournalEntry
from .serializers import AccountGroupSerializer, ChartOfAccountSerializer, JournalEntrySerializer

from django.db.models import Sum, Q, DecimalField
from django.db.models.functions import Coalesce
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
        
        if company_uuid:
            qs = qs.filter(company_uuid=company_uuid)
            
        if wing_uuid:
            qs = qs.filter(wing_uuid=wing_uuid)
            
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

        # Consolidated report logic
        group_filter = Q(parent=None)
        if company_uuid:
            group_filter &= Q(company_uuid=company_uuid)
            
        groups = AccountGroup.objects.filter(group_filter)

        data = {
            "asset": {"groups": [], "total": Decimal('0')},
            "liability": {"groups": [], "total": Decimal('0')},
            "equity": {"groups": [], "total": Decimal('0')},
        }
        
        for group in groups:
            group_total = self.get_group_balance(group, wing_uuid, as_of_date)
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

    def get_group_balance(self, group, wing_uuid, as_of_date=None):
        total = Decimal('0')
        accounts = group.accounts.all()
        
        for acc in accounts:
            # Base calculation from Journal Items
            items_qs = JournalItem.objects.filter(account=acc)
            if wing_uuid:
                items_qs = items_qs.filter(entry__wing_uuid=wing_uuid)
            if as_of_date:
                items_qs = items_qs.filter(entry__date__lte=as_of_date)
            
            debits = items_qs.aggregate(Sum('debit'))['debit__sum'] or Decimal('0')
            credits = items_qs.aggregate(Sum('credit'))['credit__sum'] or Decimal('0')
            
            # Opening balance is usually company-level (unit-level)
            # For branch level, we might ignore opening balance if not recorded per branch
            acc_opening = acc.opening_balance if not wing_uuid else Decimal('0')
            
            if group.group_type.lower() in ['asset', 'expense']:
                total += (acc_opening + debits - credits)
            else:
                total += (acc_opening + credits - debits)
        
        # Subgroups recursion
        for sub in group.subgroups.all():
            total += self.get_group_balance(sub, wing_uuid, as_of_date)
            
        return total

class ProfitLossView(APIView):
    def get(self, request):
        company_uuid = request.query_params.get('company_uuid')
        wing_uuid = request.query_params.get('wing_uuid')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')

        # Consolidated report logic
        group_filter = Q(parent=None) & (Q(group_type__iexact="income") | Q(group_type__iexact="expense"))
        if company_uuid:
            group_filter &= Q(company_uuid=company_uuid)

        groups = AccountGroup.objects.filter(group_filter)

        data = {
            "income": {"groups": [], "total": Decimal('0')},
            "expense": {"groups": [], "total": Decimal('0')},
            "net_profit": Decimal('0')
        }
        
        for group in groups:
            g_type = group.group_type.lower()
            if g_type not in ["income", "expense"]:
                continue
                
            group_total = self.get_periodic_balance(group, wing_uuid, start_date, end_date)
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

    def get_periodic_balance(self, group, wing_uuid, start_date, end_date):
        total = Decimal('0')
        accounts = group.accounts.all()
        
        for acc in accounts:
            items_qs = JournalItem.objects.filter(account=acc)
            if wing_uuid:
                items_qs = items_qs.filter(entry__wing_uuid=wing_uuid)
            if start_date:
                items_qs = items_qs.filter(entry__date__gte=start_date)
            if end_date:
                items_qs = items_qs.filter(entry__date__lte=end_date)
            
            debits = items_qs.aggregate(Sum('debit'))['debit__sum'] or Decimal('0')
            credits = items_qs.aggregate(Sum('credit'))['credit__sum'] or Decimal('0')
            
            # For P&L, we don't use opening balances. We only track activity in the period.
            if group.group_type.lower() == 'expense':
                total += (debits - credits)
            else: # Income
                total += (credits - debits)
        
        for sub in group.subgroups.all():
            total += self.get_periodic_balance(sub, wing_uuid, start_date, end_date)
            
        return total
