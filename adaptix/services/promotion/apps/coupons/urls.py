from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CouponViewSet

router = DefaultRouter()
router.register(r'', CouponViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
