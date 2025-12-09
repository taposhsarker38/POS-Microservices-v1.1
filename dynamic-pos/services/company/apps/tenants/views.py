from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError

from .models import (
    Company, NavigationItem, CompanySetting, Wing,
    Currency, InvoiceSettings, Employee
)
from .serializers import (
    CompanySettingSerializer, NavigationItemSerializer, WingSerializer,
    CurrencySerializer, InvoiceSettingsSerializer, EmployeeSerializer
)


# --------------------------------------------------------
# Helper: validate company UUID from JWT middleware
# --------------------------------------------------------
def get_company_from_request(request):
    company_uuid = getattr(request, "company_uuid", None)
    if not company_uuid:
        return None

    try:
        return Company.objects.get(auth_company_uuid=company_uuid)
    except Company.DoesNotExist:
        return None


# --------------------------------------------------------
# Company Setting ViewSet
# --------------------------------------------------------
class CompanySettingViewSet(viewsets.ModelViewSet):
    serializer_class = CompanySettingSerializer

    def get_queryset(self):
        company = get_company_from_request(self.request)
        return CompanySetting.objects.filter(company=company)

    def perform_create(self, serializer):
        company = get_company_from_request(self.request)
        if not company:
            raise ValidationError({"detail": "Company not found or not associated with user."})
        serializer.save(company=company)


# --------------------------------------------------------
# Navigation Menu ViewSet
# --------------------------------------------------------
class NavigationItemViewSet(viewsets.ModelViewSet):
    serializer_class = NavigationItemSerializer

    def get_queryset(self):
        company = get_company_from_request(self.request)
        return NavigationItem.objects.filter(company=company)

    def perform_create(self, serializer):
        company = get_company_from_request(self.request)
        if not company:
            raise ValidationError({"detail": "Company not found or not associated with user."})
        serializer.save(company=company)


# --------------------------------------------------------
# Wing (Branch/Location) ViewSet
# --------------------------------------------------------
class WingViewSet(viewsets.ModelViewSet):
    serializer_class = WingSerializer

    def get_queryset(self):
        company = get_company_from_request(self.request)
        return Wing.objects.filter(company=company)

    def perform_create(self, serializer):
        company = get_company_from_request(self.request)
        if not company:
            raise ValidationError({"detail": "Company not found or not associated with user."})
        serializer.save(company=company)


# --------------------------------------------------------
# Employee ViewSet
# --------------------------------------------------------
class EmployeeViewSet(viewsets.ModelViewSet):
    serializer_class = EmployeeSerializer

    def get_queryset(self):
        company = get_company_from_request(self.request)
        return Employee.objects.filter(company=company)

    def perform_create(self, serializer):
        company = get_company_from_request(self.request)
        if not company:
            raise ValidationError({"detail": "Company not found or not associated with user."})
        serializer.save(company=company)


# --------------------------------------------------------
# Currency ViewSet
# --------------------------------------------------------
class CurrencyViewSet(viewsets.ModelViewSet):
    serializer_class = CurrencySerializer
    queryset = Currency.objects.all()  # not tenant-specific


# --------------------------------------------------------
# Invoice Settings ViewSet
# --------------------------------------------------------
class InvoiceSettingsViewSet(viewsets.ModelViewSet):
    serializer_class = InvoiceSettingsSerializer

    def get_queryset(self):
        company = get_company_from_request(self.request)
        return InvoiceSettings.objects.filter(company=company)

    def perform_create(self, serializer):
        company = get_company_from_request(self.request)
        if not company:
            raise ValidationError({"detail": "Company not found or not associated with user."})
        serializer.save(company=company)


# --------------------------------------------------------
# Utility: Fetch company data (for FE startup)
# --------------------------------------------------------
class CompanyInfoViewSet(viewsets.ViewSet):
    """
    GET /api/company/info/
    Returns company meta + menus + settings
    """
    def list(self, request):
        company = get_company_from_request(request)
        if not company:
            return Response({"detail": "Company not found"}, status=404)

        settings = CompanySetting.objects.filter(company=company).first()
        nav_items = NavigationItem.objects.filter(company=company)

        return Response({
            "company": {
                "id": company.id,
                "auth_company_uuid": company.auth_company_uuid,
                "name": company.name,
                "code": company.code,
                "timezone": company.timezone,
            },
            "settings": CompanySettingSerializer(settings).data if settings else None,
            "navigation": NavigationItemSerializer(nav_items, many=True).data,
        })
