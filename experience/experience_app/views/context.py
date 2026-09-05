"""Las dos entradas públicas: domicilio y mesa. Una sola maquinaria."""
from rest_framework.decorators import api_view
from rest_framework.response import Response

from experience_app.adapters.registry.client import resolve
from experience_app.services import catalog


def _context(tenant):
    table = tenant.table_token and {'numero': tenant.table_number, 'token': tenant.table_token}
    return {'restaurante': {'slug': tenant.restaurant_slug, 'nombre': tenant.restaurant_name},
            'sede': {'slug': tenant.venue_slug, 'nombre': tenant.venue_name}, 'mesa': table or None,
            'marca': {'nombre': tenant.restaurant_name, **tenant.brand}}


@api_view(['GET'])
def entry(request, restaurant, venue, token=None):
    tenant = resolve(restaurant, venue, token)
    return Response({'contexto': _context(tenant), 'carta': catalog.menu_view(catalog.get_catalog(tenant))})
