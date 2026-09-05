import hmac

from django.conf import settings
from rest_framework.decorators import api_view
from rest_framework.response import Response

from experience_app.services import catalog


@api_view(['POST'])
def invalidate_menu(request, restaurant, venue):
    key = request.headers.get('X-Internal-Key', '')
    if not settings.EXPERIENCE_INTERNAL_KEY or not hmac.compare_digest(key, settings.EXPERIENCE_INTERNAL_KEY):
        return Response({'detail': 'clave interna inválida'}, status=401)
    catalog.invalidate(restaurant, venue)
    return Response({'invalidada': f'{restaurant}/{venue}'})
