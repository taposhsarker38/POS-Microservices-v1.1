"""
Adaptix Multi-Tenant Configuration
==================================
Supports multiple companies on a single deployment.
Each company gets their own subdomain or path-based routing.

Routing Options:
1. Subdomain: abc-corp.adaptix.io
2. Path-based: adaptix.io/abc-corp
3. Custom domain: pos.abc-corp.com → CNAME to adaptix.io
"""

import os
from typing import Optional
from django.http import HttpRequest
from django.conf import settings


class TenantRouter:
    """
    Determines the current tenant from request.
    Supports subdomain, path, and custom domain routing.
    """
    
    # Your main SaaS domain
    MAIN_DOMAIN = os.environ.get('SAAS_DOMAIN', 'adaptix.io')
    
    # Reserved subdomains (not for tenants)
    RESERVED_SUBDOMAINS = [
        'www', 'api', 'admin', 'app', 'dashboard', 
        'login', 'register', 'docs', 'support', 'status'
    ]
    
    @classmethod
    def get_tenant_from_request(cls, request: HttpRequest) -> Optional[str]:
        """
        Extract tenant identifier from request.
        Returns company_code or None.
        """
        host = request.get_host().split(':')[0]  # Remove port
        
        # Method 1: Subdomain routing (abc-corp.adaptix.io)
        if cls.MAIN_DOMAIN in host:
            subdomain = host.replace(f'.{cls.MAIN_DOMAIN}', '').replace(cls.MAIN_DOMAIN, '')
            if subdomain and subdomain not in cls.RESERVED_SUBDOMAINS:
                return subdomain
        
        # Method 2: Custom domain (check database)
        tenant = cls._get_tenant_by_custom_domain(host)
        if tenant:
            return tenant
        
        # Method 3: Path-based (/t/abc-corp/api/...)
        path = request.path
        if path.startswith('/t/'):
            parts = path.split('/')
            if len(parts) >= 3:
                return parts[2]
        
        # Method 4: Header (X-Tenant-ID) for API clients
        tenant_header = request.headers.get('X-Tenant-ID')
        if tenant_header:
            return tenant_header
        
        return None
    
    @classmethod
    def _get_tenant_by_custom_domain(cls, domain: str) -> Optional[str]:
        """
        Look up custom domain in database.
        Cached for performance.
        """
        from django.core.cache import cache
        
        cache_key = f"domain_tenant:{domain}"
        tenant = cache.get(cache_key)
        
        if tenant is None:
            # Query database (this would be in Company model)
            try:
                from apps.core.models import Company
                company = Company.objects.filter(
                    custom_domain=domain,
                    is_active=True
                ).first()
                tenant = company.code if company else ''
                cache.set(cache_key, tenant, 3600)  # Cache 1 hour
            except Exception:
                tenant = ''
        
        return tenant if tenant else None


class TenantMiddleware:
    """
    Middleware to set tenant context on every request.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Get tenant from request
        tenant_code = TenantRouter.get_tenant_from_request(request)
        
        # Store on request for later use
        request.tenant_code = tenant_code
        
        # If we have tenant, also get company_uuid
        if tenant_code:
            request.company_uuid = self._get_company_uuid(tenant_code)
        else:
            request.company_uuid = None
        
        return self.get_response(request)
    
    def _get_company_uuid(self, tenant_code: str) -> Optional[str]:
        """Get company_uuid from tenant code."""
        from django.core.cache import cache
        
        cache_key = f"tenant_uuid:{tenant_code}"
        company_uuid = cache.get(cache_key)
        
        if company_uuid is None:
            try:
                from apps.core.models import Company
                company = Company.objects.filter(
                    code=tenant_code,
                    is_active=True
                ).first()
                company_uuid = str(company.id) if company else ''
                cache.set(cache_key, company_uuid, 3600)
            except Exception:
                company_uuid = ''
        
        return company_uuid if company_uuid else None
