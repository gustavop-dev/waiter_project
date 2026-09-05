"""
Settings de experiencia del comensal (bloque 3).

Recorte de la plantilla del fleet (base_django_react_next_feature): sin JWT,
silk, huey, thumbnails ni MySQL — en esta etapa no hay usuarios ni tareas.
La base se elige por DJANGO_DB_ENGINE (sqlite3 por defecto, como la plantilla).
"""
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / '.env')

DJANGO_ENV = os.getenv('DJANGO_ENV', 'development')
IS_PRODUCTION = DJANGO_ENV == 'production'
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY', 'change-me')
DEBUG = os.getenv('DJANGO_DEBUG', 'true').lower() in {'1', 'true', 'yes', 'on'}
ALLOWED_HOSTS = [h.strip() for h in os.getenv('DJANGO_ALLOWED_HOSTS', '').split(',') if h.strip()]

INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.auth',
    'corsheaders',
    'rest_framework',
    'experience_app',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

CORS_ALLOWED_ORIGINS = [o.strip() for o in os.getenv('DJANGO_CORS_ALLOWED_ORIGINS', '').split(',') if o.strip()]
CORS_ALLOW_CREDENTIALS = True

# API pública sin usuarios: la autorización la dan la cookie del comensal y la clave interna.
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (),
    'DEFAULT_PERMISSION_CLASSES': ('rest_framework.permissions.AllowAny',),
    'DEFAULT_RENDERER_CLASSES': ('rest_framework.renderers.JSONRenderer',),
    'UNAUTHENTICATED_USER': None,
    'EXCEPTION_HANDLER': 'experience_app.utils.errors.handle',
}

ROOT_URLCONF = 'experience_project.urls'
WSGI_APPLICATION = 'experience_project.wsgi.application'
TEMPLATES = []

_db_engine = os.getenv('DJANGO_DB_ENGINE', 'django.db.backends.sqlite3')
_db_config = {'ENGINE': _db_engine, 'NAME': os.getenv('DJANGO_DB_NAME', str(BASE_DIR / 'db.sqlite3'))}
if 'sqlite3' not in _db_engine:
    _db_config.update({
        'USER': os.getenv('DB_USER', ''), 'PASSWORD': os.getenv('DB_PASSWORD', ''),
        'HOST': os.getenv('DB_HOST', 'localhost'), 'PORT': os.getenv('DB_PORT', '5432'),
    })
DATABASES = {'default': _db_config}

# locmem en dev; en prod DJANGO_CACHE_URL=redis://... (django.core.cache.backends.redis.RedisCache)
_cache_url = os.getenv('DJANGO_CACHE_URL', '')
CACHES = {
    'default': (
        {'BACKEND': 'django.core.cache.backends.redis.RedisCache', 'LOCATION': _cache_url}
        if _cache_url else {'BACKEND': 'django.core.cache.backends.locmem.LocMemCache'}
    )
}

LANGUAGE_CODE = 'es-co'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

LOG_LEVEL = os.getenv('DJANGO_LOG_LEVEL', 'INFO')
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {'verbose': {'format': '[{asctime}] {levelname} {name} {message}', 'style': '{'}},
    'handlers': {'console': {'class': 'logging.StreamHandler', 'formatter': 'verbose'}},
    'root': {'handlers': ['console'], 'level': LOG_LEVEL},
}

# ---------------------------------------------------------------------------
# Bloque 3 — experiencia del comensal
# ---------------------------------------------------------------------------
REGISTRY_URL = os.getenv('REGISTRY_URL', 'http://192.168.56.10:8002').rstrip('/')
REGISTRY_INTERNAL_KEY = os.getenv('REGISTRY_INTERNAL_KEY', '')
EXPERIENCE_INTERNAL_KEY = os.getenv('EXPERIENCE_INTERNAL_KEY', '')
MENU_CACHE_SECONDS = int(os.getenv('MENU_CACHE_SECONDS', '60'))
TENANT_CACHE_SECONDS = int(os.getenv('TENANT_CACHE_SECONDS', '120'))
ODOO_TIMEOUT_SECONDS = int(os.getenv('ODOO_TIMEOUT_SECONDS', '20'))
