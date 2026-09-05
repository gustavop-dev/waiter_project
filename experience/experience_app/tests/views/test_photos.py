from unittest.mock import patch

from django.urls import reverse

from experience_app.tests.conftest import DELIVERY

PHOTO = reverse('product-photo', args=['burger-house', 'poblado', 3])


@patch('experience_app.views.photos.pos.fetch_product_image', return_value=b'\xff\xd8jpeg')
@patch('experience_app.views.photos.resolve', return_value=DELIVERY)
def test_photo_streams_the_bytes_with_public_cache_headers(resolve, fetch, api_client, catalog_stub):
    """Atrapa una foto que no llega como imagen, sin caché, o pedida a Odoo con el id de producto en vez del de plantilla."""
    response = api_client.get(PHOTO)
    assert response.status_code == 200
    assert response.content == b'\xff\xd8jpeg'
    assert response['Content-Type'] == 'image/jpeg'
    assert response['Cache-Control'] == 'public, max-age=3600'
    assert fetch.call_args.args[1] == 21
    assert fetch.call_args.args[0].creds == DELIVERY.odoo


@patch('experience_app.views.photos.pos.fetch_product_image')
@patch('experience_app.views.photos.resolve', return_value=DELIVERY)
def test_photo_is_404_without_touching_odoo_when_the_product_has_no_image(resolve, fetch, api_client, catalog_stub):
    """Atrapa una ida a Odoo (o un placeholder suyo) por cada plato sin foto."""
    response = api_client.get(reverse('product-photo', args=['burger-house', 'poblado', 7]))
    assert response.status_code == 404
    assert response.json() == {'detail': 'sin foto'}
    assert fetch.call_count == 0


@patch('experience_app.views.photos.pos.fetch_product_image', return_value=None)
@patch('experience_app.views.photos.resolve', return_value=DELIVERY)
def test_photo_is_404_when_odoo_returns_no_image(resolve, fetch, api_client, catalog_stub):
    """Atrapa un 200 vacío cuando Odoo no entrega la imagen."""
    response = api_client.get(PHOTO)
    assert response.status_code == 404
    assert response.json() == {'detail': 'sin foto'}


def test_entry_menu_points_photos_to_the_experience_route(api_client, table_tenant, catalog_stub):
    """Atrapa una carta con la URL de Odoo (o sin URL) en la foto de un plato."""
    body = api_client.get(reverse('entry-table', args=['burger-house', 'poblado', '8H2KQ7'])).json()
    bebidas, hamburguesas = body['carta']['categorias']
    assert hamburguesas['productos'][0]['foto'] == '/api/v1/burger-house/poblado/fotos/3/'
    assert bebidas['productos'][0]['foto'] is None
