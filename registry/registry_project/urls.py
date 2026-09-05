import os

from django.conf import settings
from django.http import JsonResponse
from django.urls import include, path


def health_check(request):
    # 'project' y 'environment' dejan verificar QUIÉN respondió (convención del fleet).
    return JsonResponse({
        'status': 'ok',
        'project': settings.BASE_DIR.name,
        'environment': getattr(settings, 'DJANGO_ENV', os.getenv('DJANGO_ENV', 'development')),
    })


urlpatterns = [
    path('api/health/', health_check, name='health-check'),
    path('', include('registry_app.urls')),
]
