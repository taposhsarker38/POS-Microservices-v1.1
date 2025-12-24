from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomerViewSet, AttributeSetViewSet, AttributeViewSet

router = DefaultRouter()
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'attribute-sets', AttributeSetViewSet, basename='attribute-set')
router.register(r'attributes', AttributeViewSet, basename='attribute')

urlpatterns = [
    path('', include(router.urls)),
]
