from rest_framework.routers import DefaultRouter
from .views import VehicleViewSet, ShipmentViewSet, DeliveryRouteViewSet

router = DefaultRouter()
router.register(r'vehicles', VehicleViewSet)
router.register(r'shipments', ShipmentViewSet)
router.register(r'routes', DeliveryRouteViewSet)

urlpatterns = router.urls
