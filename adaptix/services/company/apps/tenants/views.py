from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError

from .models import (
    Company, NavigationItem, CompanySetting, Wing,
    Currency, InvoiceSettings, Employee,
    Department, Designation, AccountGroup, ChartOfAccount
)
from .serializers import (
    CompanySettingSerializer, NavigationItemSerializer, WingSerializer,
    CurrencySerializer, InvoiceSettingsSerializer, EmployeeSerializer,
    DepartmentSerializer, DesignationSerializer, AccountGroupSerializer, ChartOfAccountSerializer,
    CompanySerializer, OrganizationTreeSerializer
)
from adaptix_core.permissions import HasPermission


# --------------------------------------------------------
# Helper: validate company UUID from JWT middleware
# --------------------------------------------------------
def get_company_from_request(request):
    """
    Returns the Root company or any company associated with the tenant UUID.
    Searches by both PK and auth_company_uuid to handle diverse client scenarios.
    """
    company_uuid = getattr(request, "company_uuid", None)
    
    if company_uuid:
        from django.db.models import Q
        # Try finding by PK or by Tenant UUID. 
        # We prefer a root (parent__isnull=True) but any will do to get the auth_company_uuid context.
        return Company.objects.filter(
            Q(id=company_uuid) | Q(auth_company_uuid=company_uuid)
        ).order_by('parent_id').first()

    # Fallback for Superuser (Checking user_claims from JWTCompanyMiddleware)
    claims = getattr(request, "user_claims", {})
    if claims.get("is_superuser"):
        return Company.objects.first()

    # Legacy check for session-based request.user
    user = getattr(request, "user", None)
    if user and getattr(user, "is_superuser", False):
        return Company.objects.first()

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
        # Get tenant context from request
        company_uuid = getattr(self.request, "company_uuid", None)
        
        # Try to find company by ID or auth_company_uuid
        root = get_company_from_request(self.request)
        
        if root and root.auth_company_uuid:
            # Filter by tenant - return all wings belonging to companies in this tenant
            return Wing.objects.filter(company__auth_company_uuid=root.auth_company_uuid)
        elif company_uuid:
            # Fallback filter
            return Wing.objects.filter(company__auth_company_uuid=company_uuid)
        else:
            # No auth context - return empty for security
            return Wing.objects.none()

    def perform_create(self, serializer):
        # Default to request company, but allow override for hierarchy
        company = serializer.validated_data.get('company') or get_company_from_request(self.request)
        if not company:
            raise ValidationError({"detail": "Company not found."})
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

    def partial_update(self, request, pk=None):
        """
        PATCH /api/company/info/detail/
        Updates company name/timezone
        """
        company = get_company_from_request(request)
        if not company:
            return Response({"detail": "Company not found"}, status=404)

        serializer = CompanySerializer(company, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    @action(detail=False, methods=['get'])
    def tree(self, request):
        """
        GET /api/company/info/tree/
        Returns full organizational hierarchy
        """
        company = get_company_from_request(request)
        
        if not company:
            return Response({"detail": "Company not found"}, status=404)

        # Get the top-most parent (Root Group)
        root = company
        while root.parent:
            root = root.parent
            
        serializer = OrganizationTreeSerializer(root)
        return Response(serializer.data)


# --------------------------------------------------------
# Company CRUD ViewSet
# --------------------------------------------------------
class CompanyViewSet(viewsets.ModelViewSet):
    serializer_class = CompanySerializer

    def get_queryset(self):
        # Allow seeing all companies in the same tenant tree
        company = get_company_from_request(self.request)
        if not company:
            return Company.objects.none()
        
        return Company.objects.filter(auth_company_uuid=company.auth_company_uuid)

    def perform_create(self, serializer):
        company = get_company_from_request(self.request)
        
        if not company:
            # Case 1: New Setup - User creating their first Root Company / Organization
            # We allow this and generate a new Tenant UUID
            import uuid
            new_tenant_uuid = uuid.uuid4()
            serializer.save(auth_company_uuid=new_tenant_uuid, parent=None, is_group=True)
            print(f"DEBUG: Created new Root Company with auth_uuid={new_tenant_uuid}")
        else:
            # Case 2: Existing Tenant - Adding a Subsidiary or Branch
            # Must inherit the tenant context (auth_company_uuid)
            serializer.save(auth_company_uuid=company.auth_company_uuid)


# --------------------------------------------------------
# HRMS ViewSets
# --------------------------------------------------------
class DepartmentViewSet(viewsets.ModelViewSet):
    serializer_class = DepartmentSerializer
    permission_classes = [HasPermission]
    required_permission = "view_department"  # Example permission

    def get_queryset(self):
        company = get_company_from_request(self.request)
        return Department.objects.filter(company=company)
    def perform_create(self, serializer):
        company = get_company_from_request(self.request)
        if not company:
            raise ValidationError({"detail": "Company not found or not associated with user."})
        serializer.save(company=company)

class DesignationViewSet(viewsets.ModelViewSet):
    serializer_class = DesignationSerializer
    permission_classes = [HasPermission]
    required_permission = "view_designation"

    def get_queryset(self):
        company = get_company_from_request(self.request)
        return Designation.objects.filter(company=company)
    def perform_create(self, serializer):
        company = get_company_from_request(self.request)
        if not company:
            raise ValidationError({"detail": "Company not found or not associated with user."})
        serializer.save(company=company)

# --------------------------------------------------------
# Accounting ViewSets
# --------------------------------------------------------
class AccountGroupViewSet(viewsets.ModelViewSet):
    serializer_class = AccountGroupSerializer
    permission_classes = [HasPermission]
    required_permission = "view_accounting"

    def get_queryset(self):
        company = get_company_from_request(self.request)
        return AccountGroup.objects.filter(company=company)
    def perform_create(self, serializer):
        company = get_company_from_request(self.request)
        if not company:
            raise ValidationError({"detail": "Company not found or not associated with user."})
        serializer.save(company=company)

class ChartOfAccountViewSet(viewsets.ModelViewSet):
    serializer_class = ChartOfAccountSerializer
    permission_classes = [HasPermission]
    required_permission = "view_accounting"

    def get_queryset(self):
        company = get_company_from_request(self.request)
        return ChartOfAccount.objects.filter(company=company)
    def perform_create(self, serializer):
        company = get_company_from_request(self.request)
        if not company:
            raise ValidationError({"detail": "Company not found or not associated with user."})
        serializer.save(company=company)
