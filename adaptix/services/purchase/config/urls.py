from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from apps.vendors.views import VendorViewSet
from apps.procurement.views import PurchaseOrderViewSet

router = DefaultRouter()
router.register(r'vendors', VendorViewSet, basename='vendor')
router.register(r'orders', PurchaseOrderViewSet, basename='order')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/purchase/', include(router.urls)),

    # OpenAPI
    path('api/purchase/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/purchase/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]
