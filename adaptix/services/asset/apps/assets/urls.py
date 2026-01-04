from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AssetCategoryViewSet, AssetViewSet, DepreciationScheduleViewSet,
    AssetTelemetryViewSet, AssetMaintenanceTaskViewSet
)

router = DefaultRouter()
router.register(r'categories', AssetCategoryViewSet)
router.register(r'assets', AssetViewSet)
router.register(r'depreciation', DepreciationScheduleViewSet)
router.register(r'telemetry', AssetTelemetryViewSet)
router.register(r'maintenance-tasks', AssetMaintenanceTaskViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
