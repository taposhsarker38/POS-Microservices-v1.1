from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SalesForecastViewSet

router = DefaultRouter()
router.register(r'sales', SalesForecastViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
