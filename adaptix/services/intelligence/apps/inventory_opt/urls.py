from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import InventoryOptimizationViewSet

router = DefaultRouter()
router.register(r'opt', InventoryOptimizationViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
