from rest_framework import viewsets, filters
from drf_spectacular.utils import extend_schema
from .models import Customer
from .serializers import CustomerSerializer
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import status
from decimal import Decimal

@extend_schema(tags=['customers'])
class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by('-created_at')
    serializer_class = CustomerSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'phone', 'email']

    @action(detail=True, methods=['post'])
    def adjust_points(self, request, pk=None):
        customer = self.get_object()
        action_type = request.data.get('action') # 'add' or 'deduct'
        points = Decimal(str(request.data.get('points', 0)))

        # Integrate with new Loyalty App
        from apps.loyalty.models import LoyaltyAccount, LoyaltyTransaction
        from django.db import transaction

        with transaction.atomic():
            # Get or create account
            account, _ = LoyaltyAccount.objects.get_or_create(customer=customer)
            
            points_int = int(points) # Account uses Integer
            
            if action_type == 'add':
                # Update Account
                account.balance += points_int
                account.lifetime_points += points_int
                account.save()
                
                # Log Transaction
                LoyaltyTransaction.objects.create(
                    account=account,
                    transaction_type='earn',
                    points=points_int,
                    description='Manual Adjustment / POS Earn',
                    created_by=str(request.user.id if request.user.is_authenticated else 'system')
                )
                
                # Update Legacy Customer Field (Sync)
                customer.loyalty_points = Decimal(account.balance)
                
            elif action_type == 'deduct':
                if account.balance < points_int:
                     return Response(
                        {'error': 'Insufficient points'}, 
                        status=status.HTTP_400_BAD_REQUEST
                    )
                account.balance -= points_int
                account.save()
                
                LoyaltyTransaction.objects.create(
                    account=account,
                    transaction_type='redeem',
                    points=-points_int,
                    description='Manual Adjustment / POS Redeem',
                    created_by=str(request.user.id if request.user.is_authenticated else 'system')
                )
                
                customer.loyalty_points = Decimal(account.balance)

            else:
                 return Response(
                    {'error': 'Invalid action. Use "add" or "deduct"'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            customer.calculate_tier()
            customer.save()
            
            # Update Account Tier based on Customer Tier (or vice versa? Logic is mixed now)
            # Ideally Account should drive Tier. But Customer.calculate_tier() drives Customer.tier.
            # Let's simple sync for now.
        
        return Response(self.get_serializer(customer).data)
