"""
Adaptix Security Middleware
===========================
Production-grade security middleware for all services.
"""

import time
import hashlib
import logging
from collections import defaultdict
from django.http import JsonResponse
from django.conf import settings
from django.core.cache import cache

security_logger = logging.getLogger('security')


class RateLimitMiddleware:
    """
    Rate limiting to prevent brute force attacks and API abuse.
    
    Uses Redis cache if available, otherwise in-memory (not recommended for production).
    """
    
    # Endpoints with stricter limits
    SENSITIVE_ENDPOINTS = [
        '/api/auth/login',
        '/api/auth/password/reset',
        '/api/auth/register',
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.request_counts = defaultdict(list)  # Fallback if no cache
    
    def __call__(self, request):
        client_ip = self._get_client_ip(request)
        path = request.path.rstrip('/')
        
        # Check if client is blocked
        if self._is_blocked(client_ip):
            security_logger.warning(f"Blocked IP attempted access: {client_ip}")
            return JsonResponse({
                'error': 'Too many requests. Please try again later.',
                'retry_after': self._get_retry_after(client_ip)
            }, status=429)
        
        # Check rate limit
        if not self._check_rate_limit(client_ip, path):
            self._record_violation(client_ip, path)
            return JsonResponse({
                'error': 'Rate limit exceeded',
                'retry_after': 60
            }, status=429)
        
        response = self.get_response(request)
        return response
    
    def _get_client_ip(self, request):
        """Get real client IP, considering proxies."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR', 'unknown')
        return ip
    
    def _check_rate_limit(self, client_ip, path):
        """Check if request is within rate limits."""
        rate_settings = getattr(settings, 'RATE_LIMIT_SETTINGS', {})
        
        # Determine limit type
        if any(path.startswith(ep) for ep in self.SENSITIVE_ENDPOINTS):
            limit_config = rate_settings.get('sensitive', {
                'max_attempts': 5,
                'window_seconds': 300
            })
        else:
            limit_config = rate_settings.get('api', {
                'max_requests': 100,
                'window_seconds': 60
            })
        
        cache_key = f"rate_limit:{client_ip}:{path}"
        
        try:
            # Try to use cache (Redis)
            current_count = cache.get(cache_key, 0)
            if current_count >= limit_config.get('max_attempts', limit_config.get('max_requests', 100)):
                return False
            cache.set(cache_key, current_count + 1, limit_config['window_seconds'])
        except Exception:
            # Fallback to in-memory (not production-ready)
            now = time.time()
            window = limit_config['window_seconds']
            self.request_counts[cache_key] = [
                t for t in self.request_counts[cache_key] if now - t < window
            ]
            if len(self.request_counts[cache_key]) >= limit_config.get('max_requests', 100):
                return False
            self.request_counts[cache_key].append(now)
        
        return True
    
    def _is_blocked(self, client_ip):
        """Check if IP is temporarily blocked."""
        blocked_key = f"blocked:{client_ip}"
        return bool(cache.get(blocked_key, False))
    
    def _record_violation(self, client_ip, path):
        """Record rate limit violation, potentially blocking IP."""
        security_logger.warning(f"Rate limit exceeded: IP={client_ip}, Path={path}")
        
        violation_key = f"violations:{client_ip}"
        try:
            violations = cache.get(violation_key, 0) + 1
            cache.set(violation_key, violations, 3600)  # Track for 1 hour
            
            # Block after 10 violations
            if violations >= 10:
                cache.set(f"blocked:{client_ip}", True, 900)  # Block for 15 mins
                security_logger.error(f"IP blocked due to repeated violations: {client_ip}")
        except Exception:
            pass
    
    def _get_retry_after(self, client_ip):
        """Get seconds until block expires."""
        return 900  # 15 minutes default


class SecurityHeadersMiddleware:
    """
    Adds additional security headers to all responses.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        response = self.get_response(request)
        
        # Content Security Policy
        response['Content-Security-Policy'] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
        
        # Prevent embedding in iframes
        response['X-Frame-Options'] = 'DENY'
        
        # XSS Protection
        response['X-XSS-Protection'] = '1; mode=block'
        
        # Content Type Sniffing
        response['X-Content-Type-Options'] = 'nosniff'
        
        # Referrer Policy
        response['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        
        # Permissions Policy (modern replacement for Feature-Policy)
        response['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        
        return response


class SQLInjectionProtectionMiddleware:
    """
    Additional layer of SQL injection protection.
    Django ORM already protects, but this adds logging for suspicious patterns.
    """
    
    SUSPICIOUS_PATTERNS = [
        "' OR ",
        "'; DROP",
        "UNION SELECT",
        "1=1",
        "1 = 1",
        "--",
        "/*",
        "*/",
        "xp_",
        "exec(",
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Check query parameters
        query_string = request.META.get('QUERY_STRING', '')
        
        for pattern in self.SUSPICIOUS_PATTERNS:
            if pattern.lower() in query_string.lower():
                client_ip = self._get_client_ip(request)
                security_logger.critical(
                    f"POTENTIAL SQL INJECTION ATTEMPT: IP={client_ip}, "
                    f"Pattern={pattern}, Path={request.path}"
                )
                return JsonResponse({'error': 'Invalid request'}, status=400)
        
        # Check POST data
        if request.method == 'POST':
            try:
                body = request.body.decode('utf-8', errors='ignore').lower()
                for pattern in self.SUSPICIOUS_PATTERNS:
                    if pattern.lower() in body:
                        client_ip = self._get_client_ip(request)
                        security_logger.critical(
                            f"POTENTIAL SQL INJECTION IN POST: IP={client_ip}, "
                            f"Pattern={pattern}, Path={request.path}"
                        )
                        return JsonResponse({'error': 'Invalid request'}, status=400)
            except Exception:
                pass
        
        return self.get_response(request)
    
    def _get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0].strip()
        return request.META.get('REMOTE_ADDR', 'unknown')


class XSSProtectionMiddleware:
    """
    Additional XSS protection for request inputs.
    """
    
    DANGEROUS_PATTERNS = [
        '<script',
        'javascript:',
        'onerror=',
        'onload=',
        'onclick=',
        'onmouseover=',
        'eval(',
        'document.cookie',
        'document.write',
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Check for XSS patterns in query string
        query_string = request.META.get('QUERY_STRING', '').lower()
        
        for pattern in self.DANGEROUS_PATTERNS:
            if pattern in query_string:
                security_logger.warning(
                    f"XSS attempt blocked: IP={request.META.get('REMOTE_ADDR')}, "
                    f"Pattern={pattern}"
                )
                return JsonResponse({'error': 'Invalid characters in request'}, status=400)
        
        return self.get_response(request)
