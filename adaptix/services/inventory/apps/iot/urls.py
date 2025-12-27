from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ShelfViewSet, IoTDeviceViewSet, IoTReadingListCreateView

router = DefaultRouter()
router.register(r'shelves', ShelfViewSet)
router.register(r'devices', IoTDeviceViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('readings/', IoTReadingListCreateView.as_view(), name='iot-readings'),
]
