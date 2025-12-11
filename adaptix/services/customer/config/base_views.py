"""
Base ViewSet Classes for HRMS Service
=====================================
Provides automatic company_uuid filtering and injection.
"""

from rest_framework import viewsets, permissions


class CompanyFilterMixin:
    """Auto-filters queryset by company_uuid from JWT token."""
    
    def get_queryset(self):
        queryset = super().get_queryset()
        company_uuid = getattr(self.request, 'company_uuid', None)
        
        if company_uuid and hasattr(queryset.model, 'company_uuid'):
            return queryset.filter(company_uuid=company_uuid)
        return queryset


class CompanyCreateMixin:
    """Auto-injects company_uuid on object creation."""
    
    def perform_create(self, serializer):
        company_uuid = getattr(self.request, 'company_uuid', None)
        claims = getattr(self.request, 'user_claims', {}) or {}
        user_id = claims.get('sub') or claims.get('user_id')
        
        extra_fields = {}
        model = serializer.Meta.model
        
        if hasattr(model, 'company_uuid') and company_uuid:
            extra_fields['company_uuid'] = company_uuid
        
        if hasattr(model, 'created_by') and user_id:
            extra_fields['created_by'] = user_id
            
        serializer.save(**extra_fields)


class HasPermission(permissions.BasePermission):
    """Standard permission class that checks JWT claims."""
    
    def has_permission(self, request, view):
        required_perm = getattr(view, 'required_permission', None)
        if not required_perm:
            return True
        
        claims = getattr(request, 'user_claims', {}) or {}
        user_perms = claims.get('permissions', [])
        roles = claims.get('roles', [])
        
        if 'superuser' in roles or 'admin' in roles:
            return True
        
        return required_perm in user_perms


class BaseCompanyViewSet(CompanyFilterMixin, CompanyCreateMixin, viewsets.ModelViewSet):
    """
    Base ViewSet for company-scoped resources.
    
    Features:
    - Auto-filters queryset by company_uuid
    - Auto-injects company_uuid on create
    - Standard permission checking
    """
    permission_classes = [HasPermission]
    required_permission = None
