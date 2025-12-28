from rest_framework import viewsets, filters
from drf_spectacular.utils import extend_schema
from .models import Customer, AttributeSet, Attribute
from .serializers import CustomerSerializer, AttributeSetSerializer, AttributeSerializer
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

    @action(detail=True, methods=['post'], url_path='send-verification')
    def send_verification(self, request, pk=None):
        customer = self.get_object()
        type = request.data.get('type') # 'email' or 'phone'

        import random
        from adaptix_core.messaging import publish_event
        otp = str(random.randint(100000, 999999))

        if type == 'email' and customer.email:
            customer.email_otp = otp
            customer.save()
            publish_event('events', 'customer.verify_email', {
                'type': 'customer.verify_email',
                'email': customer.email,
                'otp': otp,
                'customer_name': customer.name,
                'company_uuid': str(customer.company_uuid) if customer.company_uuid else None
            })
            return Response({"message": f"OTP sent to {customer.email}", "mock_otp": otp}) 
        elif type == 'phone' and customer.phone:
            customer.phone_otp = otp
            customer.save()
             # In real app: send_sms(customer.phone, otp)
            return Response({"message": f"OTP sent to {customer.phone}", "mock_otp": otp})
        
        return Response({"error": "Invalid type or missing info"}, status=400)

    @action(detail=True, methods=['post'], url_path='verify-otp')
    def verify_otp(self, request, pk=None):
        customer = self.get_object()
        type = request.data.get('type')
        otp = request.data.get('otp')

        if type == 'email':
            if customer.email_otp == otp:
                customer.is_email_verified = True
                customer.email_otp = None
                customer.save()
                return Response({"status": "verified"})
        elif type == 'phone':
             if customer.phone_otp == otp:
                customer.is_phone_verified = True
                customer.phone_otp = None
                customer.save()
                return Response({"status": "verified"})

        return Response({"error": "Invalid OTP"}, status=400)

    def perform_create(self, serializer):
        # Auto-detect Branch/Wing ID
        branch_id = self.request.data.get('branch_id')
        
        # If not in body, check headers (e.g. from Kong or Client)
        if not branch_id:
             branch_id = self.request.headers.get('X-Branch-ID') or self.request.headers.get('X-Wing-ID')
             
        # If not in headers, check Token Claims (if Auth service puts it there)
        if not branch_id and hasattr(self.request, 'user_claims'):
             branch_id = self.request.user_claims.get('branch_id') or self.request.user_claims.get('wing_id')

        save_kwargs = {}
        if branch_id:
            save_kwargs['branch_id'] = branch_id

        serializer.save(**save_kwargs)

class AttributeSetViewSet(viewsets.ModelViewSet):
    queryset = AttributeSet.objects.all()
    serializer_class = AttributeSetSerializer

class AttributeViewSet(viewsets.ModelViewSet):
    queryset = Attribute.objects.all()
    serializer_class = AttributeSerializer
