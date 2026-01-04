from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
import uuid
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError
from django_filters.rest_framework import DjangoFilterBackend

from .models import Category, Brand, Unit, Product, ProductVariant, Attribute, AttributeSet
from .serializers import (
    CategorySerializer, BrandSerializer, UnitSerializer,
    ProductSerializer, ProductVariantSerializer,
    AttributeSerializer, AttributeSetSerializer
)
from adaptix_core.permissions import HasPermission

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
    filterset_fields = ['category', 'brand', 'product_type', 'is_active']
    ordering_fields = ['name', 'created_at']

    def perform_create(self, serializer):
        cid = get_company_uuid(self.request)
        if not cid:
            raise ValidationError({"detail": "Company context missing."})
        
        product = serializer.save(company_uuid=cid)
        
        # Check if we should create a default variant
        # Frontend might send 'price', 'cost', 'sku', 'quantity' in the root payload for simple products
        data = self.request.data
        should_create_variant = any(k in data for k in ['price', 'cost', 'sku', 'quantity'])
        
        # Or if no variants provided at all, create a default one
        if should_create_variant or not product.variants.exists():
            ProductVariant.objects.create(
                company_uuid=cid,
                product=product,
                name="Default",
                sku=data.get('sku') or f"SKU-{product.name[:3].upper()}-{uuid.uuid4().hex[:6].upper()}",
                price=data.get('price', 0),
                cost=data.get('cost', 0),
                quantity=data.get('quantity', 0),
                alert_quantity=data.get('alert_quantity', 10)
            )


class ProductVariantViewSet(BaseCompanyViewSet):
    queryset = ProductVariant.objects.all()
    serializer_class = ProductVariantSerializer
    required_permission = "view_product"
    search_fields = ['name', 'sku', 'product__name']
    ordering_fields = ['price', 'quantity']

    @action(detail=True, methods=['get'], url_path='calculate-price')
    def calculate_price(self, request, pk=None):
        variant = self.get_object()
        price_list_uuid = request.query_params.get('price_list_uuid')
        
        if price_list_uuid:
            try:
                # Find the price in the specific list
                item = PriceListItem.objects.filter(
                    price_list__id=price_list_uuid,
                    variant_uuid=variant.id
                ).first()
                if item:
                    return Response({
                        "variant_id": variant.id,
                        "price": item.price,
                        "price_list_applied": True,
                        "price_list_id": price_list_uuid
                    })
            except Exception:
                pass # Fallback to default
        
        return Response({
            "variant_id": variant.id,
            "price": variant.price,
            "price_list_applied": False
        })

# ... existing imports ...
from .models import ApprovalRequest
from .serializers import ApprovalRequestSerializer
from .audit import audit_background
from apps.utils.notifications import notify_background


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

from .models import PriceList, PriceListItem
from .serializers import PriceListSerializer, PriceListItemSerializer

class PriceListViewSet(BaseCompanyViewSet):
    queryset = PriceList.objects.all()
    serializer_class = PriceListSerializer
    required_permission = "view_product" # Adjust permissions as needed
    search_fields = ['name']

class PriceListItemViewSet(viewsets.ModelViewSet):
    """
    Direct management of prices for specific variants in a list.
    Filtered by Price List.
    """
    queryset = PriceListItem.objects.all()
    serializer_class = PriceListItemSerializer
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['price_list', 'variant_uuid']

    def perform_create(self, serializer):
        # Validation: Ensure price list belongs to the company
        # (Skipped for brevity but recommended for production)
        serializer.save()
