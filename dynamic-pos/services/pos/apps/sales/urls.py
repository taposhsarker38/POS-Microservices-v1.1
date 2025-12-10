from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet, PaymentViewSet, POSSessionViewSet

router = DefaultRouter()
router.register(r'orders', OrderViewSet)
router.register(r'payments', PaymentViewSet)
router.register(r'sessions', POSSessionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
