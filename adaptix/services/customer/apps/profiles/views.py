from rest_framework import viewsets, filters
from drf_spectacular.utils import extend_schema
from .models import Customer
from .serializers import CustomerSerializer

@extend_schema(tags=['customers'])
class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all().order_by('-created_at')
    serializer_class = CustomerSerializer
    filter_backends = [filters.SearchFilter]
    search_fields = ['name', 'phone', 'email']
