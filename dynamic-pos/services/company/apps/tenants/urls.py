from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CompanySettingViewSet, NavigationItemViewSet, WingViewSet,
    EmployeeViewSet, CurrencyViewSet, InvoiceSettingsViewSet,
    CompanyInfoViewSet
)

router = DefaultRouter()
router.register("info", CompanyInfoViewSet, basename="company-info")
router.register("settings", CompanySettingViewSet, basename="settings")
router.register("navigation", NavigationItemViewSet, basename="navigation")
router.register("wings", WingViewSet, basename="wings")
router.register("employees", EmployeeViewSet, basename="employees")
router.register("currencies", CurrencyViewSet, basename="currencies")
router.register("invoice-settings", InvoiceSettingsViewSet, basename="invoice-settings")
urlpatterns = router.urls