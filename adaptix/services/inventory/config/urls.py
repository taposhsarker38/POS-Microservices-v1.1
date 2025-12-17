from django.contrib import admin
from django.urls import path, include
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

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/inventory/', include(router.urls)),
    path('api/inventory/manufacturing/', include('apps.manufacturing.urls')),
]
