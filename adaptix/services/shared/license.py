"""
Adaptix License Validation System
==================================
Validates customer licenses on startup and periodically.
Prevents unauthorized usage of the software.
"""

import os
import hashlib
import hmac
import json
import base64
import logging
from datetime import datetime, timedelta
from functools import wraps

import requests
from django.conf import settings
from django.core.cache import cache
from django.http import JsonResponse

logger = logging.getLogger('license')


class LicenseValidator:
    """
    Validates Adaptix licenses with the central license server.
    """
    
    LICENSE_SERVER = "https://license.adaptix.io/api/v1"  # Your license server
    CACHE_KEY = "adaptix_license_valid"
    CACHE_TIMEOUT = 3600  # Re-validate every hour
    
    def __init__(self):
        self.license_key = os.environ.get('LICENSE_KEY')
        self.company_id = os.environ.get('COMPANY_ID')
        self.machine_id = self._get_machine_id()
    
    def _get_machine_id(self):
        """Generate unique machine identifier."""
        try:
            # Combine multiple factors for uniqueness
            factors = [
                os.environ.get('HOSTNAME', ''),
                os.environ.get('COMPUTERNAME', ''),
            ]
            combined = '|'.join(factors)
            return hashlib.sha256(combined.encode()).hexdigest()[:32]
        except Exception:
            return 'unknown'
    
    def validate(self):
        """
        Validate the license.
        Returns True if valid, False otherwise.
        """
        # Check cache first
        cached = cache.get(self.CACHE_KEY)
        if cached is not None:
            return cached
        
        # Validate license
        is_valid = self._validate_with_server()
        
        # Cache result
        cache.set(self.CACHE_KEY, is_valid, self.CACHE_TIMEOUT)
        
        return is_valid
    
    def _validate_with_server(self):
        """Validate license with central server."""
        if not self.license_key:
            logger.error("No license key configured")
            return False
        
        try:
            response = requests.post(
                f"{self.LICENSE_SERVER}/validate",
                json={
                    'license_key': self.license_key,
                    'company_id': self.company_id,
                    'machine_id': self.machine_id,
                    'product': 'adaptix',
                    'version': getattr(settings, 'ADAPTIX_VERSION', '1.0.0'),
                },
                timeout=10,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get('valid'):
                    logger.info(f"License validated: {data.get('plan', 'standard')}")
                    return True
                else:
                    logger.error(f"License invalid: {data.get('reason', 'Unknown')}")
                    return False
            else:
                logger.error(f"License server error: {response.status_code}")
                # Fail open for connectivity issues (grace period)
                return self._check_offline_grace_period()
                
        except requests.RequestException as e:
            logger.warning(f"License server unreachable: {e}")
            return self._check_offline_grace_period()
    
    def _check_offline_grace_period(self):
        """
        Allow offline usage for a grace period.
        Useful if license server is temporarily unavailable.
        """
        grace_key = "adaptix_license_grace"
        grace_start = cache.get(grace_key)
        
        if grace_start is None:
            # Start grace period
            cache.set(grace_key, datetime.now().isoformat(), 86400 * 7)  # 7 days
            logger.warning("License server unreachable. Starting 7-day grace period.")
            return True
        
        # Check if grace period expired
        grace_datetime = datetime.fromisoformat(grace_start)
        if datetime.now() - grace_datetime > timedelta(days=7):
            logger.error("License grace period expired")
            return False
        
        logger.warning("Operating in grace period - license server unreachable")
        return True
    
    def get_license_info(self):
        """Get license details."""
        if not self.validate():
            return None
        
        try:
            response = requests.get(
                f"{self.LICENSE_SERVER}/info",
                params={'license_key': self.license_key},
                timeout=10
            )
            if response.status_code == 200:
                return response.json()
        except Exception:
            pass
        
        return None


# Middleware for license validation
class LicenseMiddleware:
    """
    Middleware to validate license on each request.
    Blocks all requests if license is invalid.
    """
    
    EXEMPT_PATHS = [
        '/health/',
        '/license/activate/',
    ]
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.validator = LicenseValidator()
    
    def __call__(self, request):
        # Skip exempt paths
        if any(request.path.startswith(p) for p in self.EXEMPT_PATHS):
            return self.get_response(request)
        
        # Validate license
        if not self.validator.validate():
            return JsonResponse({
                'error': 'License validation failed',
                'code': 'LICENSE_INVALID',
                'message': 'Please contact support@adaptix.io'
            }, status=403)
        
        return self.get_response(request)


# Decorator for license-restricted features
def require_license_tier(tier='standard'):
    """
    Decorator to restrict features to specific license tiers.
    
    Usage:
        @require_license_tier('enterprise')
        def enterprise_only_view(request):
            ...
    """
    def decorator(view_func):
        @wraps(view_func)
        def wrapper(request, *args, **kwargs):
            validator = LicenseValidator()
            info = validator.get_license_info()
            
            if not info:
                return JsonResponse({
                    'error': 'License required',
                    'code': 'LICENSE_REQUIRED'
                }, status=403)
            
            tiers = ['starter', 'standard', 'professional', 'enterprise']
            user_tier = info.get('tier', 'starter')
            
            if tiers.index(user_tier) < tiers.index(tier):
                return JsonResponse({
                    'error': f'This feature requires {tier} tier or higher',
                    'code': 'LICENSE_TIER_INSUFFICIENT',
                    'current_tier': user_tier,
                    'required_tier': tier
                }, status=403)
            
            return view_func(request, *args, **kwargs)
        return wrapper
    return decorator


# Offline license validation (no server required)
class OfflineLicenseValidator:
    """
    Validate licenses offline using cryptographic signatures.
    License key contains encrypted expiration date and features.
    """
    
    # Public key for signature verification (embed in code)
    PUBLIC_KEY = """
    -----BEGIN PUBLIC KEY-----
    YOUR_PUBLIC_KEY_HERE
    -----END PUBLIC KEY-----
    """
    
    def validate_offline(self, license_key):
        """
        Validate license without server connection.
        License format: BASE64(JSON{company_id, expires, features, signature})
        """
        try:
            # Decode license
            decoded = base64.b64decode(license_key)
            data = json.loads(decoded)
            
            # Check expiration
            expires = datetime.fromisoformat(data['expires'])
            if datetime.now() > expires:
                return False, "License expired"
            
            # Verify signature
            signature = data.pop('signature')
            payload = json.dumps(data, sort_keys=True)
            
            # In production, use proper RSA signature verification
            expected_sig = hmac.new(
                self.PUBLIC_KEY.encode(),
                payload.encode(),
                hashlib.sha256
            ).hexdigest()
            
            if not hmac.compare_digest(signature, expected_sig):
                return False, "Invalid signature"
            
            return True, data
            
        except Exception as e:
            return False, str(e)
