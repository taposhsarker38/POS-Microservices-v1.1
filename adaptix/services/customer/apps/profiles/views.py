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

        if action_type == 'add':
            customer.loyalty_points += points
        elif action_type == 'deduct':
            if customer.loyalty_points < points:
                return Response(
                    {'error': 'Insufficient points'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
            customer.loyalty_points -= points
        else:
            return Response(
                {'error': 'Invalid action. Use "add" or "deduct"'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        customer.calculate_tier()
        customer.save()
        
        return Response(self.get_serializer(customer).data)
