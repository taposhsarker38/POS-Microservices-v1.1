import os
from pathlib import Path
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("SECRET_KEY", "hrms-secret-key")

DEBUG = os.environ.get("DEBUG", "False") == "True"

ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party
    'rest_framework',
    'corsheaders',
    'drf_spectacular',
    
    # Local
    'apps.employees',
    'apps.attendance',
    'apps.leaves',
    'apps.noticeboard',
    'apps.payroll',
    'apps.shifts',
    'apps.performance',
    'apps.projects',
    'django_prometheus',
]

MIDDLEWARE = [
    'django_prometheus.middleware.PrometheusBeforeMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'config.middleware.JWTCompanyMiddleware',  # JWT & company_uuid extraction
    'config.middleware.AuditMiddleware',  # Audit logging
    'django_prometheus.middleware.PrometheusAfterMiddleware',
]

# JWT Configuration
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'RS256')
JWT_ISSUER = os.environ.get('JWT_ISSUER', 'auth-service')
JWT_AUDIENCE = os.environ.get('JWT_AUDIENCE', 'pos-system')
PUBLIC_KEY_PATH = os.environ.get('PUBLIC_KEY_PATH', '/keys/public.pem')

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

DATABASES = {
    'default': dj_database_url.config(default=os.environ.get("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/hrmsdb"))
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')
STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 100,
}

SPECTACULAR_SETTINGS = {
    'TITLE': 'Adaptix - HRMS API',
    'DESCRIPTION': 'Human Resource Management System (Employees, Attendance, Payroll).',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

CORS_ALLOW_ALL_ORIGINS = True

# Message Queue
RABBITMQ_URL = os.environ.get('RABBITMQ_URL', 'amqp://adaptix:adaptix123@rabbitmq:5672/')

# Tracing
try:
    from config.tracing import setup_tracing
    if os.environ.get("ENABLE_TRACING", "False") == "True":
        setup_tracing("hrms-service")
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
