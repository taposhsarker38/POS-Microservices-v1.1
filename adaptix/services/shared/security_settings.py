"""
Adaptix Security Configuration
==============================
Enterprise-grade security settings for production deployment.
Apply these settings in each service's settings.py
"""

import os

# ============================================
# 🔐 SECURITY HEADERS (Django Built-in)
# ============================================

# Force HTTPS in production
SECURE_SSL_REDIRECT = os.environ.get('SECURE_SSL_REDIRECT', 'False') == 'True'

# HTTP Strict Transport Security (HSTS)
# Forces browsers to only use HTTPS for 1 year
SECURE_HSTS_SECONDS = int(os.environ.get('SECURE_HSTS_SECONDS', '31536000'))  # 1 year
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Secure Cookie Settings
SESSION_COOKIE_SECURE = os.environ.get('SESSION_COOKIE_SECURE', 'False') == 'True'
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Lax'  # Prevents CSRF from third-party sites

CSRF_COOKIE_SECURE = os.environ.get('CSRF_COOKIE_SECURE', 'False') == 'True'
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Lax'

# Content Security
SECURE_CONTENT_TYPE_NOSNIFF = True  # Prevents MIME-sniffing
SECURE_BROWSER_XSS_FILTER = True    # XSS Protection (legacy browsers)
X_FRAME_OPTIONS = 'DENY'            # Clickjacking protection

# Referrer Policy
SECURE_REFERRER_POLICY = 'strict-origin-when-cross-origin'


# ============================================
# 🔑 PASSWORD VALIDATION
# ============================================

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 12},  # Strong: 12+ characters
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# ============================================
# 🛡️ RATE LIMITING SETTINGS (For custom middleware)
# ============================================

RATE_LIMIT_SETTINGS = {
    # Login attempts
    'login': {
        'max_attempts': 5,
        'window_seconds': 300,  # 5 minutes
        'lockout_seconds': 900,  # 15 minutes
    },
    # API calls
    'api': {
        'max_requests': 100,
        'window_seconds': 60,  # Per minute
    },
    # Sensitive operations (password reset, etc.)
    'sensitive': {
        'max_attempts': 3,
        'window_seconds': 3600,  # 1 hour
    }
}


# ============================================
# 🔐 JWT SECURITY SETTINGS
# ============================================

from datetime import timedelta

SIMPLE_JWT = {
    # Short-lived access tokens
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    
    # Refresh tokens for session continuity
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    
    # Rotate refresh tokens (one-time use)
    'ROTATE_REFRESH_TOKENS': True,
    
    # Blacklist old tokens after rotation
    'BLACKLIST_AFTER_ROTATION': True,
    
    # Strong algorithm
    'ALGORITHM': 'RS256',
    
    # Token claims
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'sub',
    
    # Token types
    'TOKEN_TYPE_CLAIM': 'token_type',
    'JTI_CLAIM': 'jti',
    
    # Sliding sessions
    'SLIDING_TOKEN_REFRESH_EXP_CLAIM': 'refresh_exp',
    'SLIDING_TOKEN_LIFETIME': timedelta(minutes=15),
    'SLIDING_TOKEN_REFRESH_LIFETIME': timedelta(days=1),
}


# ============================================
# 🌐 CORS SECURITY (Production)
# ============================================

# In production, explicitly list allowed origins
CORS_ALLOWED_ORIGINS = os.environ.get('CORS_ALLOWED_ORIGINS', '').split(',')

# Only allow credentials from trusted origins
CORS_ALLOW_CREDENTIALS = True

# Limited HTTP methods
CORS_ALLOW_METHODS = [
    'GET',
    'POST',
    'PUT',
    'PATCH',
    'DELETE',
    'OPTIONS',
]

# Allowed headers
CORS_ALLOW_HEADERS = [
    'authorization',
    'content-type',
    'x-requested-with',
    'accept',
    'origin',
    'x-csrftoken',
]

# Never use in production:
# CORS_ALLOW_ALL_ORIGINS = True  # ❌ DANGEROUS


# ============================================
# 📝 LOGGING (Security Events)
# ============================================

LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'security': {
            'format': '[{levelname}] {asctime} {name} - {message}',
            'style': '{',
        },
    },
    'handlers': {
        'security_file': {
            'level': 'WARNING',
            'class': 'logging.FileHandler',
            'filename': '/var/log/adaptix/security.log',
            'formatter': 'security',
        },
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'security',
        },
    },
    'loggers': {
        'security': {
            'handlers': ['security_file', 'console'],
            'level': 'INFO',
            'propagate': False,
        },
        'django.security': {
            'handlers': ['security_file', 'console'],
            'level': 'WARNING',
            'propagate': False,
        },
    },
}


# ============================================
# 🚫 IP BLOCKING SETTINGS
# ============================================

# IPs to always block (known bad actors)
BLOCKED_IPS = os.environ.get('BLOCKED_IPS', '').split(',')

# IPs to always allow (internal services)
ALLOWED_IPS = os.environ.get('ALLOWED_IPS', '').split(',')


# ============================================
# 📋 SECURITY CHECKLIST FOR DEPLOYMENT
# ============================================
"""
Before deploying to production, ensure:

1. [ ] DEBUG = False
2. [ ] SECRET_KEY is unique and stored in environment
3. [ ] ALLOWED_HOSTS is explicitly set
4. [ ] SECURE_SSL_REDIRECT = True
5. [ ] All cookie settings are secure
6. [ ] Database passwords are strong and from environment
7. [ ] JWT private keys are properly secured
8. [ ] CORS_ALLOWED_ORIGINS explicitly lists domains
9. [ ] Rate limiting is enabled
10. [ ] Logging is configured to capture security events
11. [ ] Database connections use SSL
12. [ ] All services communicate over internal network only
"""
