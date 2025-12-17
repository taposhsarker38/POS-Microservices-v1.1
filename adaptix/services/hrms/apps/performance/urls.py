from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    KPIViewSet, 
    EmployeeKPIViewSet, 
    PerformanceReviewViewSet, 
    PromotionViewSet, 
    IncrementViewSet
)

router = DefaultRouter()
router.register(r'kpis', KPIViewSet)
router.register(r'employee-kpis', EmployeeKPIViewSet)
router.register(r'reviews', PerformanceReviewViewSet)
router.register(r'promotions', PromotionViewSet)
router.register(r'increments', IncrementViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
