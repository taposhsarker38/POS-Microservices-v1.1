from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomerSegmentationViewSet

router = DefaultRouter()
router.register(r'segments', CustomerSegmentationViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
