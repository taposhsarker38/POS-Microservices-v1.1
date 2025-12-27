from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet, PaymentViewSet, POSSessionViewSet, POSSettingsViewSet, OrderReturnViewSet

router = DefaultRouter()
router.register(r'orders', OrderViewSet)
router.register(r'payments', PaymentViewSet)
router.register(r'sessions', POSSessionViewSet)
router.register(r'settings', POSSettingsViewSet)
router.register(r'returns', OrderReturnViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
