"""Endpoints de plantillas: catálogo público, miniatura, ajustes internos y la plantilla en el contexto de entrada."""
from unittest.mock import patch

import pytest
from django.urls import reverse

from experience_app.models import VenueMenuSettings
from experience_app.tests.conftest import TABLE

CATALOG = reverse('template-catalog')
SETTINGS = reverse('venue-menu-settings', args=['burger-house', 'poblado'])
PERCENT = 'experience_app.services.discount.percent_for'


@pytest.mark.django_db
def test_public_catalog_is_cacheable_and_carries_thumbnails(api_client):
    """Atrapa un catálogo sin caché pública (30 specs por visita del POS) o sin la URL de la miniatura."""
    response = api_client.get(CATALOG)
    assert response.status_code == 200
    assert response['Cache-Control'] == 'public, max-age=3600'
    body = response.json()
    assert body['familias']['A'] == 'Alta cocina'
    b1 = next(p for p in body['plantillas'] if p['codigo'] == 'B1')
    assert b1['miniatura'] == reverse('template-thumbnail', args=['B1'])
    assert 'resumen' not in b1['pantallas']['carrito']


def test_thumbnail_is_a_png_with_long_cache_and_404_when_missing(api_client):
    """Atrapa una miniatura sin caché inmutable, mal tipada, o una ruta que lea fuera de la carpeta de miniaturas."""
    response = api_client.get(reverse('template-thumbnail', args=['B1']))
    assert response.status_code == 200
    assert response['Content-Type'] == 'image/png'
    assert response['Cache-Control'] == 'public, max-age=86400, immutable'
    assert response.content.startswith(b'\x89PNG')
    assert api_client.get(reverse('template-thumbnail', args=['Z9'])).status_code == 404
    assert api_client.get('/api/v1/plantillas/../miniatura/').status_code == 404


@pytest.mark.django_db
def test_internal_settings_require_the_key(api_client, settings):
    """Atrapa ajustes de sede legibles o escribibles sin la clave interna (el POS pasa por el addon, nunca directo)."""
    settings.EXPERIENCE_INTERNAL_KEY = 'k'
    assert api_client.get(SETTINGS).status_code == 401
    assert api_client.put(SETTINGS, {'plantilla': 'A1'}, format='json', HTTP_X_INTERNAL_KEY='nope').status_code == 401
    settings.EXPERIENCE_INTERNAL_KEY = ''
    assert api_client.get(SETTINGS, HTTP_X_INTERNAL_KEY='').status_code == 401
    assert VenueMenuSettings.objects.count() == 0


@pytest.mark.django_db
def test_internal_get_returns_raw_settings_and_put_returns_the_resolved_template(api_client, settings, company_brand_stub):
    """Atrapa un GET que devuelva la plantilla resuelta en vez de lo editable, o un PUT que no devuelva lo que el comensal verá."""
    settings.EXPERIENCE_INTERNAL_KEY = 'k'
    before = api_client.get(SETTINGS, HTTP_X_INTERNAL_KEY='k').json()
    assert before == {'plantilla': 'B1', 'paleta': {}, 'tipografia': {}, 'actualizado': None, 'porDefecto': True}
    body = {'plantilla': 'A3', 'paleta': {'acento': '#2f7a4f'}, 'tipografia': {'display': 'Lora'}}
    with patch('experience_app.plantillas.views.resolve', return_value=TABLE), patch(PERCENT, return_value=7.5):
        response = api_client.put(SETTINGS, body, format='json', HTTP_X_INTERNAL_KEY='k')
    assert response.status_code == 200
    resolved = response.json()['plantilla']
    assert (resolved['codigo'], resolved['tokens']['acento'], resolved['tokens']['acentoTinta'], resolved['tokens']['displayFont']) == ('A3', '#2F7A4F', '#FFFFFF', 'Lora')
    assert resolved['descuento'] == {'porcentaje': 7.5, 'activo': True}
    after = api_client.get(SETTINGS, HTTP_X_INTERNAL_KEY='k').json()
    assert (after['plantilla'], after['paleta'], after['tipografia'], after['porDefecto']) == ('A3', {'acento': '#2F7A4F'}, {'display': 'Lora'}, False)


@pytest.mark.django_db
def test_internal_put_rejects_what_the_catalog_does_not_allow(api_client, settings):
    """Atrapa un 500 (o un guardado) ante una plantilla inexistente o un color fuera de contraste."""
    settings.EXPERIENCE_INTERNAL_KEY = 'k'
    response = api_client.put(SETTINGS, {'plantilla': 'Z9'}, format='json', HTTP_X_INTERNAL_KEY='k')
    assert response.status_code == 400 and 'no está en el catálogo' in response.json()['detail']
    response = api_client.put(SETTINGS, {'plantilla': 'B1', 'paleta': {'acento': '#808080'}}, format='json', HTTP_X_INTERNAL_KEY='k')
    assert response.status_code == 400 and 'no contrasta' in response.json()['detail']
    assert VenueMenuSettings.objects.count() == 0


@pytest.mark.django_db
def test_entry_context_carries_the_resolved_template(api_client, table_tenant, catalog_stub):
    """Atrapa una entrada sin `plantilla` (el motor del comensal no sabría qué pintar) o con la marca sin aplicar."""
    plantilla = api_client.get(reverse('entry-table', args=['burger-house', 'poblado', '8H2KQ7'])).json()['contexto']['plantilla']
    assert plantilla['codigo'] == 'B1'
    assert plantilla['layouts']['menu'] == 'B1'
    assert plantilla['tokens']['acento'] == '#7A2E2A'  # la marca del registro (conftest.BRAND)
    assert plantilla['descuento'] == {'porcentaje': 5.0, 'activo': True}  # pos.config no lo fijó: el 5 % del diseño
