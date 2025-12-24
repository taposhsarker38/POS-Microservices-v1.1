from django.contrib import admin
from django.urls import path, include
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from rest_framework.routers import DefaultRouter
from apps.stocks.views import (
    WarehouseViewSet, StockViewSet, TransactionViewSet,
    UOMConversionViewSet, StockSerialViewSet, BillOfMaterialViewSet
)

router = DefaultRouter()
router.register(r'warehouses', WarehouseViewSet)
router.register(r'stocks', StockViewSet)
router.register(r'transactions', TransactionViewSet)
router.register(r'uom', UOMConversionViewSet)
router.register(r'serials', StockSerialViewSet)
router.register(r'bom', BillOfMaterialViewSet)

from django_prometheus.exports import ExportToDjangoView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/inventory/', include(router.urls)),
    path('metrics/', ExportToDjangoView, name='prometheus-metrics'),

    # OpenAPI
    path('api/inventory/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/inventory/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
]
