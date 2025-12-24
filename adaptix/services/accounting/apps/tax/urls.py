from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TaxViewSet, TaxZoneViewSet, TaxRuleViewSet, TaxEngineViewSet

router = DefaultRouter()
router.register(r'rates', TaxViewSet)
router.register(r'zones', TaxZoneViewSet)
router.register(r'rules', TaxRuleViewSet)
router.register(r'engine', TaxEngineViewSet, basename='tax-engine')

urlpatterns = [
    path('', include(router.urls)),
]
