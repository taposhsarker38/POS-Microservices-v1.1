from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.routers import DefaultRouter
from apps.stocks.views import (
    WarehouseViewSet, StockViewSet, TransactionViewSet,
    UOMConversionViewSet, StockSerialViewSet, BillOfMaterialViewSet,
    StockTransferViewSet
)

router = DefaultRouter()
router.register(r'warehouses', WarehouseViewSet)
router.register(r'stocks', StockViewSet)
router.register(r'transactions', TransactionViewSet)
router.register(r'uom', UOMConversionViewSet)
router.register(r'serials', StockSerialViewSet)
router.register(r'bom', BillOfMaterialViewSet)
router.register(r'transfers', StockTransferViewSet)

from django_prometheus.exports import ExportToDjangoView
from django.http import JsonResponse
def health_check(request):
    return JsonResponse({"status": "ok"})

urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health_check, name='health_check'),
    path('api/inventory/health/', health_check),
    path('api/inventory/', include(router.urls)),
    path('api/inventory/iot/', include('apps.iot.urls')),
    path('metrics/', ExportToDjangoView, name='prometheus-metrics'),

    # OpenAPI
    path('api/inventory/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/inventory/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]
