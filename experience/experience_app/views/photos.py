"""Foto de un plato, servida por la experiencia: el comensal nunca ve la URL ni la sesión de Odoo."""
from django.http import HttpResponse
from rest_framework.decorators import api_view
from rest_framework.response import Response

from experience_app.adapters.odoo import pos
from experience_app.adapters.odoo.client import OdooClient
from experience_app.adapters.registry.client import resolve
from experience_app.services import catalog

CACHE_CONTROL = 'public, max-age=3600'
NO_PHOTO = {'detail': 'sin foto'}


@api_view(['GET'])
def photo(request, restaurant, venue, product_id):
    tenant = resolve(restaurant, venue)
    product = catalog.find_product(tenant, product_id)
    # La carta (en caché) ya sabe si hay foto: sin ella no se toca Odoo.
    if not product.has_image:
        return Response(NO_PHOTO, status=404)
    data = pos.fetch_product_image(OdooClient(tenant.odoo), product.template_id)
    if data is None:
        return Response(NO_PHOTO, status=404)
    response = HttpResponse(data, content_type='image/jpeg')
    response['Cache-Control'] = CACHE_CONTROL
    return response
