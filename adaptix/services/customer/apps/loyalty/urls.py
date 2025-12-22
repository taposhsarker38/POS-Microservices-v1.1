from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LoyaltyAccountViewSet, LoyaltyProgramViewSet

router = DefaultRouter()
router.register(r'accounts', LoyaltyAccountViewSet, basename='loyalty-account')
router.register(r'program', LoyaltyProgramViewSet, basename='loyalty-program')

urlpatterns = [
    path('', include(router.urls)),
]
