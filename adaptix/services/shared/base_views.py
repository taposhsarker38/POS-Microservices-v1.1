"""
Adaptix Shared Utilities
========================
Common base classes and utilities for all microservices.
"""

from rest_framework import viewsets, permissions
from rest_framework.response import Response


class CompanyFilterMixin:
    """
    Mixin to automatically filter querysets by company_uuid from JWT token.
    """
    
    def get_queryset(self):
        queryset = super().get_queryset()
        company_uuid = getattr(self.request, 'company_uuid', None)
        
        if company_uuid and hasattr(queryset.model, 'company_uuid'):
            return queryset.filter(company_uuid=company_uuid)
        return queryset


class CompanyCreateMixin:
    """
    Mixin to automatically inject company_uuid on object creation.
    """
    
    def perform_create(self, serializer):
        company_uuid = getattr(self.request, 'company_uuid', None)
        claims = getattr(self.request, 'user_claims', {}) or {}
        user_id = claims.get('sub') or claims.get('user_id')
        
        # Build extra fields to save
        extra_fields = {}
        
        # Add company_uuid if model has the field
        model = serializer.Meta.model
        if hasattr(model, 'company_uuid') and company_uuid:
            extra_fields['company_uuid'] = company_uuid
        
        # Add created_by if model has the field
        if hasattr(model, 'created_by') and user_id:
            extra_fields['created_by'] = user_id
            
        serializer.save(**extra_fields)


class CompanyUpdateMixin:
    """
    Mixin to automatically inject updated_by on object update.
    """
    
    def perform_update(self, serializer):
        claims = getattr(self.request, 'user_claims', {}) or {}
        user_id = claims.get('sub') or claims.get('user_id')
        
        extra_fields = {}
        model = serializer.Meta.model
        
        if hasattr(model, 'updated_by') and user_id:
            extra_fields['updated_by'] = user_id
            
        serializer.save(**extra_fields)


class HasPermission(permissions.BasePermission):
    """
    Standard permission class that checks JWT claims for required_permission.
    """
    
    def has_permission(self, request, view):
        # Allow if no permission required
        required_perm = getattr(view, 'required_permission', None)
        if not required_perm:
            return True
        
        # Get permissions from request.user_claims (set by middleware)
        claims = getattr(request, 'user_claims', {}) or {}
        user_perms = claims.get('permissions', [])
        roles = claims.get('roles', [])
        
        # Superuser/Admin bypass
        if 'superuser' in roles or 'admin' in roles:
            return True
        
        # Check specific permission
        if required_perm in user_perms:
            return True
        
        return False


class BaseCompanyViewSet(CompanyFilterMixin, CompanyCreateMixin, CompanyUpdateMixin, viewsets.ModelViewSet):
    """
    Base ViewSet for all company-scoped resources.
    
    Features:
    - Auto-filters queryset by company_uuid
    - Auto-injects company_uuid on create
    - Auto-injects created_by/updated_by
    - Standard permission checking
    
    Usage:
        class EmployeeViewSet(BaseCompanyViewSet):
            queryset = Employee.objects.all()
            serializer_class = EmployeeSerializer
            required_permission = 'hrms.employee'  # Optional
    """
    permission_classes = [HasPermission]
    required_permission = None  # Override in subclass if needed


class BaseReadOnlyCompanyViewSet(CompanyFilterMixin, viewsets.ReadOnlyModelViewSet):
    """
    Read-only version for reporting/analytics endpoints.
    """
    permission_classes = [HasPermission]
    required_permission = None
