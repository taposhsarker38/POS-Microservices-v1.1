from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FinancialAnomalyViewSet

router = DefaultRouter()
router.register(r'anomalies', FinancialAnomalyViewSet, basename='financial-anomalies')

urlpatterns = [
    path('', include(router.urls)),
]
