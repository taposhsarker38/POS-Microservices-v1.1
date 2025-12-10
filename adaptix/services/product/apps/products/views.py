from rest_framework import viewsets, status, filters
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django_filters.rest_framework import DjangoFilterBackend

from .models import Category, Brand, Unit, Product, ProductVariant, Attribute, AttributeSet
from .serializers import (
    CategorySerializer, BrandSerializer, UnitSerializer,
    ProductSerializer, ProductVariantSerializer,
    AttributeSerializer, AttributeSetSerializer
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

# ... existing imports ...
from .models import ApprovalRequest
from .serializers import ApprovalRequestSerializer
from .audit import audit_background
from apps.utils.notifications import notify_background
from rest_framework.decorators import action

class ApprovalRequestViewSet(BaseCompanyViewSet):
    queryset = ApprovalRequest.objects.all()
    serializer_class = ApprovalRequestSerializer
    required_permission = "approve_product"

    def perform_create(self, serializer):
        user_id = self.request.user_claims.get("user_id") if hasattr(self.request, "user_claims") else None
        instance = serializer.save(requested_by=user_id, company_uuid=self.request.company_uuid)
        
        # Notify Admins (For now, just notifying the requester as a demo, ideally query admin IDs)
        # In real app: admins = User.objects.filter(role='admin')
        notify_background(user_id, f"Approval request created for {instance.product.name}", "approval_request")

    @action(detail=True, methods=['post'], url_path='approve')
    def approve(self, request, pk=None):
        approval = self.get_object()
        if approval.status != 'pending':
             return Response({"detail": "Already processed."}, status=status.HTTP_400_BAD_REQUEST)
        
        user_id = self.request.user_claims.get("user_id") if hasattr(self.request, "user_claims") else None
        
        approval.status = 'approved'
        approval.approved_by = user_id
        approval.save()

        product = approval.product
        product.approval_status = 'approved'
        product.save()
        
        # Log Audit
        audit_background(request, None)
        # Notify Requester
        notify_background(approval.requested_by, f"Your product {product.name} was APPROVED", "approval_approved")
        
        return Response({"status": "approved"})

    @action(detail=True, methods=['post'], url_path='reject')
    def reject(self, request, pk=None):
        approval = self.get_object()
        if approval.status != 'pending':
             return Response({"detail": "Already processed."}, status=status.HTTP_400_BAD_REQUEST)
             
        user_id = self.request.user_claims.get("user_id") if hasattr(self.request, "user_claims") else None

        approval.status = 'rejected'
        approval.approved_by = user_id
        approval.save()
        
        product = approval.product
        product.approval_status = 'rejected'
        product.save()

        audit_background(request, None)

        return Response({"status": "rejected"})

class AttributeSetViewSet(BaseCompanyViewSet):
    queryset = AttributeSet.objects.all()
    serializer_class = AttributeSetSerializer
    required_permission = "view_product" # Adjust permissions as needed
    search_fields = ['name']

class AttributeViewSet(BaseCompanyViewSet):
    queryset = Attribute.objects.all()
    serializer_class = AttributeSerializer
    required_permission = "view_product"
    search_fields = ['name', 'code', 'attribute_set__name']
    filterset_fields = ['attribute_set', 'type']
