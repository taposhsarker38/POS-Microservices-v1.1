from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AnalyticsViewSet, DailySalesViewSet, TopProductViewSet

router = DefaultRouter()
router.register(r'daily-sales', DailySalesViewSet)
router.register(r'top-products', TopProductViewSet)
router.register(r'dashboard', AnalyticsViewSet, basename='dashboard')

urlpatterns = [
    path('', include(router.urls)),
]
