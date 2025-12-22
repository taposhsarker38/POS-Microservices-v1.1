from rest_framework import viewsets, status, decorators
from rest_framework.response import Response
from django.db import transaction
from .models import LoyaltyAccount, LoyaltyTransaction, LoyaltyProgram
from .serializers import LoyaltyAccountSerializer, LoyaltyTransactionSerializer, LoyaltyProgramSerializer
from adaptix_core.permissions import HasPermission

class LoyaltyAccountViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = LoyaltyAccount.objects.all()
    serializer_class = LoyaltyAccountSerializer
    permission_classes = [HasPermission]
    required_permission = "customer.view_loyalty"

    def get_queryset(self):
        # Simple filtering.
        # If user is a customer, start simple logic:
        # return self.queryset.filter(customer__user_id=self.request.user.id)
        # But we don't have request.user context here fully mapped.
        # For Admin use, let's allow filtering by employee_uuid
        queryset = self.queryset
        employee_uuid = self.request.query_params.get('employee_uuid')
        if employee_uuid:
            queryset = queryset.filter(employee_uuid=employee_uuid)
            
        return queryset

    @decorators.action(detail=True, methods=['post'], required_permission="customer.manage_loyalty")
    def adjust(self, request, pk=None):
        """Manual adjustment of points"""
        account = self.get_object()
        points = int(request.data.get('points', 0))
        reason = request.data.get('reason', 'Manual Adjustment')
        
        if points == 0:
            return Response({"error": "Points cannot be zero"}, status=400)
            
        with transaction.atomic():
            tx_type = 'earn' if points > 0 else 'adjust'
            LoyaltyTransaction.objects.create(
                account=account,
                transaction_type=tx_type,
                points=points,
                description=reason,
                created_by=getattr(request, 'user_id', 'admin')
            )
            account.balance += points
            if points > 0:
                account.lifetime_points += points
            account.save()
            
            # TODO: Trigger Tier Check logic here
            
        return Response(LoyaltyAccountSerializer(account).data)

class LoyaltyProgramViewSet(viewsets.ModelViewSet):
    queryset = LoyaltyProgram.objects.all()
    serializer_class = LoyaltyProgramSerializer
    permission_classes = [HasPermission]
    required_permission = "customer.manage_loyalty"

    def get_queryset(self):
        # In a real multi-tenant setup, this should filter by the user's company/tenant
        queryset = self.queryset
        
        # Filter by target_audience (default to 'customer' if not specified to maintain backward comptaibility?)
        # Actually, for admin panel, they might want to see all.
        # But let's allow filtering.
        audience = self.request.query_params.get('target_audience')
        if audience:
            queryset = queryset.filter(target_audience=audience)
            
        return queryset
