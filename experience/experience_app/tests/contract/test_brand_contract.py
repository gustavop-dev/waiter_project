"""La marca editada en Odoo llega al comensal de verdad: color, tema y logo por HTTP (pytest -m contract).

Escribe en res.company del Odoo del compose y RESTAURA lo que había al salir. Falla hasta que el addon
projectapp_ops esté actualizado en ese Odoo (los campos brand_* no existen antes).
"""
import base64
from unittest.mock import patch

import pytest
from django.urls import reverse

from experience_app.adapters.odoo.client import OdooClient, OdooCredentials
from experience_app.adapters.registry.client import Tenant
from experience_app.services import brand

pytestmark = pytest.mark.contract
CREDS = OdooCredentials(url='http://192.168.56.10:8069', db='projectapp', login='admin', password='admin', pos_config_id=1)
# Marca del registro con OTRO color: si el comensal la ve, Odoo no mandó.
REGISTRY_BRAND = {'nombre': 'Burger House', 'lema': 'Del registro', 'logo': None, 'saludo': '', 'mesero': 'Alex', 'bienvenida': '',
                  'color': '#C1873A', 'colorTexto': '#1A1815', 'colorSuave': '#F9F3EB', 'fuente': 'Instrument Serif', 'radio': 14, 'contraste': 5.73}
TENANT = Tenant('burger-house', 'Burger House', 'poblado', 'Poblado', None, None, None, CREDS, REGISTRY_BRAND)
PNG_1PX = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='
ENTRY = reverse('entry-delivery', args=['burger-house', 'poblado'])


@pytest.fixture
def branded_company():
    """Escribe color y un PNG de 1 px en la compañía y los retira al salir, pase lo que pase con las aserciones."""
    client = OdooClient(CREDS)
    # Sin bin_size: el base64 completo del logo previo es lo que hay que restaurar.
    [company] = client.call_kw('res.company', 'search_read', [[], ['id', 'brand_color', 'brand_logo']], {'limit': 1})
    original = {'brand_color': company['brand_color'], 'brand_logo': company['brand_logo']}
    client.call_kw('res.company', 'write', [[company['id']], {'brand_color': '#7A2E2A', 'brand_logo': PNG_1PX}])
    brand.invalidate('burger-house', 'poblado')
    try:
        yield company['id']
    finally:
        client.call_kw('res.company', 'write', [[company['id']], original])
        brand.invalidate('burger-house', 'poblado')


@patch('experience_app.views.logo.resolve', return_value=TENANT)
@patch('experience_app.views.context.resolve', return_value=TENANT)
@pytest.mark.django_db  # la entrada lee los ajustes de plantilla de la sede (Plan H)
def test_brand_color_and_logo_written_in_odoo_reach_the_diner_over_http(context_resolve, logo_resolve, branded_company, api_client):
    """Atrapa un addon sin los campos brand_*, un color de Odoo que no pise al del registro, o un logo que no se sirva."""
    marca = api_client.get(ENTRY).json()['contexto']['marca']
    assert (marca['color'], marca['colorTexto']) == ('#7A2E2A', '#FFFFFF')
    assert marca['contraste'] >= 4.5
    # Lo no editado en Odoo sigue viniendo del registro, campo a campo.
    assert (marca['lema'], marca['mesero'], marca['fuente']) == ('Del registro', 'Alex', 'Instrument Serif')
    assert marca['logo'].startswith('/api/v1/burger-house/poblado/logo/?v=') and len(marca['logo'].rsplit('=', 1)[1]) == 14
    response = api_client.get(marca['logo'])
    assert response.status_code == 200
    assert response['Content-Type'] == 'image/png'
    assert response['Cache-Control'] == 'public, max-age=86400, immutable'
    assert response['X-Content-Type-Options'] == 'nosniff'
    assert response.content == base64.b64decode(PNG_1PX)
