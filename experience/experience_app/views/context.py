"""Las dos entradas públicas: domicilio y mesa. Una sola maquinaria."""
from urllib.parse import urlencode

from django.urls import reverse
from rest_framework.decorators import api_view
from rest_framework.response import Response

from experience_app.adapters.registry.client import resolve
from experience_app.plantillas import services as templates
from experience_app.services import brand, catalog


def _context(tenant):
    table = tenant.table_token and {'numero': tenant.table_number, 'token': tenant.table_token}
    # La marca sale de Odoo campo a campo (lo que el restaurante editó) y del registro para lo que no tocó.
    # La plantilla (Plan H) es la elegida por la sede con la marca y su paleta ya aplicadas: tokens finales y layouts.
    return {'restaurante': {'slug': tenant.restaurant_slug, 'nombre': tenant.restaurant_name},
            'sede': {'slug': tenant.venue_slug, 'nombre': tenant.venue_name}, 'mesa': table or None,
            'marca': brand.brand_view(tenant), 'plantilla': templates.resolve_template(tenant)}


def _photo_url(restaurant, venue):
    # La versión va en la URL: cuando el restaurante cambia la foto, el navegador la pide de nuevo aunque la caché sea larga.
    def build(product_id, version):
        return f"{reverse('product-photo', args=[restaurant, venue, product_id])}?{urlencode({'v': version})}"
    return build


@api_view(['GET'])
def entry(request, restaurant, venue, token=None):
    tenant = resolve(restaurant, venue, token)
    menu = catalog.menu_view(catalog.get_catalog(tenant), photo_url=_photo_url(restaurant, venue))
    return Response({'contexto': _context(tenant), 'carta': menu})
