import os
from pathlib import Path
import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("SECRET_KEY", "notification-secret-key")

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
    'apps.emails',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

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
    'default': dj_database_url.config(default=os.environ.get("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/notificationdb"))
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
    'TITLE': 'Adaptix - Notification API',
    'DESCRIPTION': 'Centralized Notification Engine (Email, SMS, WebSocket).',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
}

CORS_ALLOW_ALL_ORIGINS = True

# Celery / RabbitMQ
CELERY_BROKER_URL = os.environ.get("CELERY_BROKER_URL", "amqp://guest:guest@rabbitmq:5672//")
CELERY_RESULT_BACKEND = os.environ.get("CELERY_RESULT_BACKEND", "redis://redis:6379/5")

# Email Backend (Console for now, or SMTP via env)
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend' 

# Tracing
try:
    from config.tracing import setup_tracing
    if os.environ.get("ENABLE_TRACING", "True") == "True":
        setup_tracing("notification-service")
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
