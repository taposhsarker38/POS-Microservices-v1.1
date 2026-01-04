from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet, BrandViewSet, UnitViewSet,
    ProductViewSet, ProductVariantViewSet, ApprovalRequestViewSet,
    AttributeViewSet, AttributeSetViewSet, PriceListViewSet, PriceListItemViewSet
)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'brands', BrandViewSet)
router.register(r'units', UnitViewSet)
router.register(r'products', ProductViewSet)
router.register(r'variants', ProductVariantViewSet)
router.register(r'approvals', ApprovalRequestViewSet)
router.register(r'attributes', AttributeViewSet)
router.register(r'attribute-sets', AttributeSetViewSet)
router.register(r'price-lists', PriceListViewSet)
router.register(r'price-list-items', PriceListItemViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
