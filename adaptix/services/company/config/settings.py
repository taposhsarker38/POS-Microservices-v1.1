import os
from pathlib import Path
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret")
DEBUG = os.getenv("DEBUG", "True").lower() in ("1","true","yes")
ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "*").split(",")

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",

    "rest_framework",
    "corsheaders",
    "drf_spectacular",
    "apps.tenants",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.common.CommonMiddleware",
    "apps.tenants.middleware.JWTCompanyMiddleware",
    "config.audit_middleware.AuditMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
]

ROOT_URLCONF = "config.urls"

TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [],
    "APP_DIRS": True,
    "OPTIONS": {"context_processors": ["django.template.context_processors.debug","django.template.context_processors.request","django.contrib.auth.context_processors.auth","django.contrib.messages.context_processors.messages"]},
}]

WSGI_APPLICATION = 'config.wsgi.application'
ASGI_APPLICATION = 'config.asgi.application'

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [os.environ.get("REDIS_URL", "redis://redis:6379/1")],
        },
    },
}

DATABASE_URL = os.getenv("DATABASE_URL", "postgres://postgres:password@postgres_company:5432/companydb")
DATABASES = {"default": dj_database_url.parse(DATABASE_URL, conn_max_age=600)}

STATIC_URL = "/static/"
STATIC_ROOT = os.path.join(BASE_DIR, "static")

REST_FRAMEWORK = {
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    # If you use authentication later, add auth classes here. For now we rely on middleware token decode:
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": [],
    # Optional: page size & renderers
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.LimitOffsetPagination",
    "PAGE_SIZE": 50,
}
# Check for local key if default path doesn't exist
DEFAULT_PUB_KEY = "/keys/public.pem"
if not os.path.exists(DEFAULT_PUB_KEY):
    # Try finding it relative to this file (in services/auth/keys)
    # BASE_DIR is .../services/company
    # We want .../services/auth/keys/public.pem
    LOCAL_KEY = BASE_DIR.parent / "auth" / "keys" / "public.pem"
    if LOCAL_KEY.exists():
        DEFAULT_PUB_KEY = str(LOCAL_KEY)

PUBLIC_KEY_PATH = os.getenv("PUBLIC_KEY_PATH", DEFAULT_PUB_KEY)
JWT_ISSUER = os.getenv("JWT_ISSUER", "auth-service")
JWT_AUDIENCE = os.getenv("JWT_AUDIENCE", "pos-system")

CELERY_BROKER_URL = os.getenv("CELERY_BROKER_URL", "amqp://guest:guest@rabbitmq:5672/")
AMQP_EXCHANGE = os.getenv("AMQP_EXCHANGE", "events")

# drf-spectacular (OpenAPI) settings
SPECTACULAR_SETTINGS = {
    'TITLE': 'Adaptix - Company API',
    'DESCRIPTION': 'Dynamic Business Configuration, Tenant Management, and RBAC.',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    "SERVERS": [
        {"url": "http://localhost:8000", "description": "Local"},
    ],
    # Optional: Customize auth scheme in the docs (we use Bearer JWT)
    "COMPONENT_SPLIT_REQUEST": True,
    "SCHEMA_PATH_PREFIX": r"/api/company",
    "POSTPROCESSING_HOOKS": [],
    "CONTACT": {"name": "Your Team", "email": "dev@yourorg.example"},
    "SECURITY_DEFINITIONS": {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT"
        }
    },
    # Put BearerAuth as default for all endpoints in the doc UI (optional):
    "DEFAULT_SECURITY": [{"BearerAuth": []}],
}

CORS_ALLOW_ALL_ORIGINS = True

try:
    from config.tracing import setup_tracing
    import os
    if os.environ.get("ENABLE_TRACING", "True") == "True":
        setup_tracing("company-service")
except Exception as e:
    print(f"Skipping tracing setup: {e}")

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
        print(f"✅ Loaded Single DB Config for Schema: {db_schema}")
    except Exception as e:
        print(f"⚠️ Failed to configure Single DB: {e}")
# ==============================================
