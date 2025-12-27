from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PaymentViewSet
from .views_emi import EMIPlanViewSet, EMIScheduleViewSet, EMIInstallmentViewSet

router = DefaultRouter()
router.register(r'emi-plans', EMIPlanViewSet, basename='emi-plan')
router.register(r'emi-schedules', EMIScheduleViewSet, basename='emi-schedule')
router.register(r'emi-installments', EMIInstallmentViewSet, basename='emi-installment')
router.register(r'', PaymentViewSet, basename='payment')

urlpatterns = [
    path('', include(router.urls)),
]
