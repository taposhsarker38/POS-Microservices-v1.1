from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ForecastViewSet, SalesHistoryViewSet

router = DefaultRouter()
router.register(r'predictions', ForecastViewSet, basename='forecasts')
router.register(r'history', SalesHistoryViewSet, basename='sales-history')

urlpatterns = [
    path('', include(router.urls)),
]
