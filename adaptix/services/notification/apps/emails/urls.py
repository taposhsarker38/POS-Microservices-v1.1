from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SMTPSettingsViewSet

router = DefaultRouter()
router.register(r'smtp-settings', SMTPSettingsViewSet, basename='smtp-settings')

urlpatterns = [
    path('', include(router.urls)),
]
