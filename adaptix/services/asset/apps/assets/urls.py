from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AssetCategoryViewSet, AssetViewSet, DepreciationScheduleViewSet

router = DefaultRouter()
router.register(r'categories', AssetCategoryViewSet)
router.register(r'assets', AssetViewSet)
router.register(r'depreciation', DepreciationScheduleViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
