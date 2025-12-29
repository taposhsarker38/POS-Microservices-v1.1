

import os
from pathlib import Path
from datetime import timedelta
import dj_database_url
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent.parent

def env_bool(v, default=False):
    if v is None:
        return default
    return str(v).lower() in ("1", "true", "yes", "on")

def env_int(v, default):
    try:
        return int(v)
    except Exception:
        return default

# ---------------------------
# Core
# ---------------------------
SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
DEBUG = env_bool(os.getenv("DEBUG", "true"))

ALLOWED_HOSTS = ["*"]

# CSRF / Frontend
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
CSRF_TRUSTED_ORIGINS = os.getenv("CSRF_TRUSTED_ORIGINS", "http://localhost:8101").split(",")


# ---------------------------
# Apps / Middleware
# ---------------------------
INSTALLED_APPS = [
    # Django
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    # Third-party
    "rest_framework",
    "corsheaders",
    "django_extensions",
    "rest_framework_simplejwt.token_blacklist",
    "drf_spectacular",

    # Your apps (adjust names to your project)
    "apps.accounts",
    "apps.audit",
    "apps.utils",
    "apps.core",
    "django_prometheus",
]

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

MIDDLEWARE = [
    "django_prometheus.middleware.PrometheusBeforeMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",  # serve static
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'adaptix_core.middleware.JWTCompanyMiddleware',
    'adaptix_core.middleware.AuditMiddleware',
    'adaptix_core.middleware.CorrelationIDMiddleware',
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django_prometheus.middleware.PrometheusAfterMiddleware",
]

ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"

# ---------------------------
# Templates
# ---------------------------
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],  # add if you have templates at project level
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.debug",
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

# ---------------------------
# Database (supports DATABASE_URL or POSTGRES_* vars)
# ---------------------------
# Prefer DATABASE_URL if provided, otherwise build from POSTGRES_*
database_url = os.getenv("DATABASE_URL")
if database_url:
    DATABASES = {"default": dj_database_url.parse(database_url)}
else:
    POSTGRES_ENGINE = os.getenv("POSTGRES_ENGINE", "django.db.backends.postgresql")
    POSTGRES_DB = os.getenv("POSTGRES_DB", "authdb")
    POSTGRES_USER = os.getenv("POSTGRES_USER", "postgres")
    POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "")
    POSTGRES_HOST = os.getenv("POSTGRES_HOST", "localhost")
    POSTGRES_PORT = os.getenv("POSTGRES_PORT", "5432")
    DATABASES = {
        "default": {
            "ENGINE": POSTGRES_ENGINE,
            "NAME": POSTGRES_DB,
            "USER": POSTGRES_USER,
            "PASSWORD": POSTGRES_PASSWORD,
            "HOST": POSTGRES_HOST,
            "PORT": POSTGRES_PORT,
        }
    }

# ---------------------------
# Auth / Password validators
# ---------------------------
AUTH_USER_MODEL = "accounts.User"
AUTH_PASSWORD_VALIDATORS = [] if DEBUG else [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

ACTIVATE_USER_IMMEDIATELY = env_bool(os.getenv("ACTIVATE_USER_IMMEDIATELY", "True"))

# ---------------------------
# Internationalization & Timezone
# ---------------------------
LANGUAGE_CODE = "en-us"
TIME_ZONE = os.getenv("TIME_ZONE", "Asia/Dhaka")
USE_I18N = True
USE_TZ = True
SPECTACULAR_SETTINGS = {
    "TITLE": "Adaptix - Auth API",
    "DESCRIPTION": "Authentication, Authorization, and User Management.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
}
# ---------------------------
# Static files (Whitenoise)
# ---------------------------
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
STATICFILES_STORAGE = "whitenoise.storage.CompressedManifestStaticFilesStorage"

# ---------------------------
# REST Framework + JWT
# ---------------------------
REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": (
        "rest_framework_simplejwt.authentication.JWTAuthentication",
    ),
    "DEFAULT_PERMISSION_CLASSES": (
        "rest_framework.permissions.IsAuthenticated",
    ),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": env_int(os.getenv("PAGE_SIZE"), 25),
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
}

# Simple JWT config:
# - support HS256 (dev) via JWT_SECRET/JWT_ALGORITHM
# - support RS256 (prod) if PRIVATE_KEY_PATH & PUBLIC_KEY_PATH mounted and JWT_ALGORITHM=RS256
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256").upper()
if JWT_ALGORITHM == "RS256":
    # Expect mounted keys at PRIVATE_KEY_PATH / PUBLIC_KEY_PATH or default /keys/*
    PRIVATE_KEY_PATH = os.getenv("PRIVATE_KEY_PATH", "/keys/private.pem")
    PUBLIC_KEY_PATH = os.getenv("PUBLIC_KEY_PATH", "/keys/public.pem")
    try:
        with open(PRIVATE_KEY_PATH, "r") as f:
            PRIVATE_KEY = f.read()
        with open(PUBLIC_KEY_PATH, "r") as f:
            PUBLIC_KEY = f.read()
    except FileNotFoundError as e:
        raise ImproperlyConfigured(f"RSA key not found: {e}")
    SIMPLE_JWT = {
        "ALGORITHM": "RS256",
        "SIGNING_KEY": PRIVATE_KEY,
        "VERIFYING_KEY": PUBLIC_KEY,
        "ACCESS_TOKEN_LIFETIME": timedelta(seconds=env_int(os.getenv("JWT_LIFETIME_SECONDS"), 3600)),
        "REFRESH_TOKEN_LIFETIME": timedelta(days=env_int(os.getenv("JWT_REFRESH_DAYS"), 7)),
        "ROTATE_REFRESH_TOKENS": env_bool(os.getenv("JWT_ROTATE", "true")),
        "BLACKLIST_AFTER_ROTATION": env_bool(os.getenv("JWT_BLACKLIST", "true")),
        "AUTH_HEADER_TYPES": ("Bearer",),
        "ISSUER": os.getenv("JWT_ISSUER"),
        "AUDIENCE": os.getenv("JWT_AUDIENCE"),
    }
else:
    # HS256 (development default)
    JWT_SECRET = os.getenv("JWT_SECRET", "supersecretjwtkey")
    SIMPLE_JWT = {
        "ALGORITHM": "HS256",
        "SIGNING_KEY": JWT_SECRET,
        "ACCESS_TOKEN_LIFETIME": timedelta(seconds=env_int(os.getenv("JWT_LIFETIME_SECONDS"), 3600)),
        "REFRESH_TOKEN_LIFETIME": timedelta(days=env_int(os.getenv("JWT_REFRESH_DAYS"), 7)),
        "ROTATE_REFRESH_TOKENS": env_bool(os.getenv("JWT_ROTATE", "true")),
        "BLACKLIST_AFTER_ROTATION": env_bool(os.getenv("JWT_BLACKLIST", "true")),
        "AUTH_HEADER_TYPES": ("Bearer",),
    }

# ensure token blacklist app included (we added to INSTALLED_APPS earlier)
# note: run migrations for token_blacklist

# ---------------------------
# Email settings
# ---------------------------

EMAIL_BACKEND = os.getenv("EMAIL_BACKEND", "django.core.mail.backends.smtp.EmailBackend")
EMAIL_HOST = os.getenv("EMAIL_HOST", "")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "25"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "False") in ("1", "True", "true")
EMAIL_USE_SSL = os.getenv("EMAIL_USE_SSL", "False") in ("1", "True", "true")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", EMAIL_HOST_USER)
SERVER_EMAIL = os.getenv("SERVER_EMAIL", DEFAULT_FROM_EMAIL)
# Fix SSL/TLS conflict
if EMAIL_USE_SSL:
    EMAIL_USE_TLS = False

# If using SSL on port 465 (secure), set EMAIL_USE_SSL=True; if using TLS (STARTTLS) on 587, set EMAIL_USE_TLS=True

# ---------------------------
# Celery (broker + backend)
# ---------------------------
CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "amqp://adaptix:adaptix123@rabbitmq:5672/")
CELERY_RESULT_BACKEND = os.getenv("CELERY_RESULT_BACKEND", os.getenv("REDIS_URL", "redis://redis:6379/0"))
CELERY_ACCEPT_CONTENT = ["json"]
CELERY_TASK_SERIALIZER = "json"
CELERY_RESULT_SERIALIZER = "json"

# ---------------------------
# CORS & CSRF
# ---------------------------
CORS_ALLOW_ALL_ORIGINS = env_bool(os.getenv("CORS_ALLOW_ALL_ORIGINS", "1"))
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_ORIGINS = [o.strip() for o in os.getenv("CORS_ALLOWED_ORIGINS", FRONTEND_URL).split(",") if o.strip()]

# ---------------------------
# Audit / Service-specific envs (from your .env)
# ---------------------------
AUTH_SERVICE_AUDIT_URL = os.getenv("AUTH_SERVICE_AUDIT_URL", os.getenv("AUTH_SERVICE_AUDIT_URL", "http://auth-web:8001/api/v1/audit/"))
SERVICE_API_TOKEN = os.getenv("SERVICE_API_TOKEN", "")
SERVICE_NAME = os.getenv("SERVICE_NAME", "auth-service")
AUDIT_LOCAL_FALLBACK = os.getenv("AUDIT_LOCAL_FALLBACK", "/tmp/audit_events_failed.log")
AUDIT_LOCAL_QUEUE = os.getenv("AUDIT_LOCAL_QUEUE", "/tmp/auth_audit_queue.log")

# ---------------------------
# Logging
# ---------------------------
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'json': {
            '()': 'adaptix_core.logging.JSONFormatter',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'json',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}

# ---------------------------
# Misc
# ---------------------------
APPEND_SLASH = True
PAGE_SIZE = env_int(os.getenv("PAGE_SIZE"), 25)

# ---------------------------
# Quick sanity checks
# ---------------------------
if not SECRET_KEY or SECRET_KEY == "dev-secret":
    if not DEBUG:
        raise ImproperlyConfigured("SECRET_KEY must be set in production")

# End of settings

try:
    from config.tracing import setup_tracing
    if os.environ.get("ENABLE_TRACING", "False") == "True":
        setup_tracing("auth-service")
except Exception as e:
    pass # print(f"Skipping tracing setup: {e}")

# ==============================================
# SCHEMA SUPPORT (Added for Single DB Migration)
# ==============================================
import dj_database_url
import os

database_url = os.environ.get("DATABASE_URL")
db_schema = os.environ.get("DB_SCHEMA", "public")

if database_url:
    try:
        db_config = dj_database_url.parse(database_url)
        # Add schema to search path (schema first, then public)
        db_config['OPTIONS'] = {'options': f'-c search_path={db_schema},public'}
        DATABASES = {"default": db_config}
        # pass # print(f"✅ Loaded Single DB Config for Schema: {db_schema}")
    except Exception as e:
        pass # print(f"⚠️ Failed to configure Single DB: {e}")
# ==============================================
