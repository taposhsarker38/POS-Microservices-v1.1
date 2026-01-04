from rest_framework.routers import DefaultRouter
from .views import WorkCenterViewSet, BillOfMaterialViewSet, ProductionOrderViewSet, OperationViewSet, ProductionOrderOperationViewSet, ProductUnitViewSet

router = DefaultRouter()
router.register(r'work-centers', WorkCenterViewSet)
router.register(r'operations', OperationViewSet)
router.register(r'operation-trackers', ProductionOrderOperationViewSet)
router.register(r'units', ProductUnitViewSet)
router.register(r'boms', BillOfMaterialViewSet)
router.register(r'orders', ProductionOrderViewSet)

urlpatterns = router.urls
