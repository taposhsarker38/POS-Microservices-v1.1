from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import AutomationRuleViewSet, ActionLogViewSet, TriggerAutomationView

router = DefaultRouter()
router.register(r'rules', AutomationRuleViewSet)
router.register(r'logs', ActionLogViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('trigger/', TriggerAutomationView.as_view(), name='trigger-automation'),
]
