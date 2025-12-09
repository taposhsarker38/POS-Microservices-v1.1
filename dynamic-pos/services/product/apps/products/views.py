from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django_filters.rest_framework import DjangoFilterBackend

from .models import Category, Brand, Unit, Product, ProductVariant
from .serializers import (
    CategorySerializer, BrandSerializer, UnitSerializer,
    ProductSerializer, ProductVariantSerializer
)
from .permissions import HasPermission

def get_company_uuid(request):
    """Helper to get company UUID from request."""
    return getattr(request, "company_uuid", None)

class BaseCompanyViewSet(viewsets.ModelViewSet):
    """Base ViewSet to filter by company and auto-assign company on create."""
    permission_classes = [HasPermission]
    required_permission = None # Override in subclasses
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]

    def get_queryset(self):
        cid = get_company_uuid(self.request)
        if not cid:
            return self.queryset.none()
        return self.queryset.filter(company_uuid=cid)

    def perform_create(self, serializer):
        cid = get_company_uuid(self.request)
        if not cid:
            raise ValidationError({"detail": "Company context missing."})
        serializer.save(company_uuid=cid)

class CategoryViewSet(BaseCompanyViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer
    required_permission = "view_product" 
    search_fields = ['name']
    ordering_fields = ['name', 'created_at']

class BrandViewSet(BaseCompanyViewSet):
    queryset = Brand.objects.all()
    serializer_class = BrandSerializer
    required_permission = "view_product"
    search_fields = ['name']
    ordering_fields = ['name']

class UnitViewSet(BaseCompanyViewSet):
    queryset = Unit.objects.all()
    serializer_class = UnitSerializer
    required_permission = "view_product"
    search_fields = ['name', 'short_name']

class ProductViewSet(BaseCompanyViewSet):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    required_permission = "view_product"
    search_fields = ['name', 'category__name', 'brand__name']
    filterset_fields = ['category', 'brand', 'type', 'is_active']
    ordering_fields = ['name', 'created_at']

class ProductVariantViewSet(BaseCompanyViewSet):
    queryset = ProductVariant.objects.all()
    serializer_class = ProductVariantSerializer
    required_permission = "view_product"
    search_fields = ['name', 'sku', 'product__name']
    ordering_fields = ['price', 'quantity']
