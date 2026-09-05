from unittest.mock import patch

from django.urls import reverse

from experience_app.tests.conftest import DELIVERY

PHOTO = reverse('product-photo', args=['burger-house', 'poblado', 3])
FETCH = 'experience_app.services.catalog.pos.fetch_product_image'
RESOLVE = 'experience_app.views.photos.resolve'
PNG = (b'\x89PNG\r\n\x1a\n', 'image/png')


@patch(FETCH, return_value=PNG)
@patch(RESOLVE, return_value=DELIVERY)
def test_photo_streams_the_bytes_with_public_cache_headers(resolve, fetch, api_client, catalog_stub):
    """Atrapa una foto PNG servida como JPEG, sin caché pública, o pedida a Odoo con el id de producto en vez del de plantilla."""
    response = api_client.get(f'{PHOTO}?v=20260905010203')
    assert response.status_code == 200
    assert response.content == b'\x89PNG\r\n\x1a\n'
    assert response['Content-Type'] == 'image/png'
    assert response['Cache-Control'] == 'public, max-age=86400, immutable'
    assert fetch.call_args.args[1:] == (21, 'tarjeta')
    assert fetch.call_args.args[0].creds == DELIVERY.odoo


@patch(FETCH, return_value=PNG)
@patch(RESOLVE, return_value=DELIVERY)
def test_photo_is_served_from_cache_on_the_second_request(resolve, fetch, api_client, catalog_stub):
    """Atrapa una segunda petición de la misma foto que vuelve a Odoo (un login por foto y por comensal nuevo)."""
    api_client.get(PHOTO)
    response = api_client.get(PHOTO)
    assert response.status_code == 200
    assert response.content == b'\x89PNG\r\n\x1a\n'
    assert fetch.call_count == 1


@patch(FETCH, return_value=PNG)
@patch(RESOLVE, return_value=DELIVERY)
def test_photo_size_picks_the_dish_resolution_and_rejects_unknown_sizes(resolve, fetch, api_client, catalog_stub):
    """Atrapa un tamaño arbitrario que llegue a Odoo, o la pantalla del plato servida con la miniatura de la tarjeta."""
    assert api_client.get(f'{PHOTO}?tam=plato').status_code == 200
    assert fetch.call_args.args[1:] == (21, 'plato')
    response = api_client.get(f'{PHOTO}?tam=image_1920')
    assert response.status_code == 400
    assert fetch.call_count == 1


@patch(FETCH)
@patch(RESOLVE, return_value=DELIVERY)
def test_photo_is_404_without_touching_odoo_when_the_product_has_no_image(resolve, fetch, api_client, catalog_stub):
    """Atrapa una ida a Odoo (o un placeholder suyo) por cada plato sin foto."""
    response = api_client.get(reverse('product-photo', args=['burger-house', 'poblado', 7]))
    assert response.status_code == 404
    assert response.json() == {'detail': 'sin foto'}
    assert fetch.call_count == 0


@patch(FETCH, return_value=None)
@patch(RESOLVE, return_value=DELIVERY)
def test_photo_is_404_when_odoo_returns_no_image(resolve, fetch, api_client, catalog_stub):
    """Atrapa un 200 vacío cuando Odoo no entrega la imagen, o una ida a Odoo por comensal mientras la carta aún dice que la hay."""
    assert api_client.get(PHOTO).status_code == 404
    response = api_client.get(PHOTO)
    assert response.status_code == 404
    assert response.json() == {'detail': 'sin foto'}
    assert fetch.call_count == 1


@patch(FETCH)
@patch(RESOLVE, return_value=DELIVERY)
def test_photo_is_404_for_a_product_not_in_the_menu(resolve, fetch, api_client, catalog_stub):
    """Atrapa el 400 'no está en la carta' (error de agregar al carrito) en un recurso GET, o una ida a Odoo por un id inventado."""
    response = api_client.get(reverse('product-photo', args=['burger-house', 'poblado', 999]))
    assert response.status_code == 404
    assert response.json() == {'detail': 'sin foto'}
    assert fetch.call_count == 0


def test_entry_menu_points_photos_to_the_experience_route(api_client, table_tenant, catalog_stub):
    """Atrapa una carta con la URL de Odoo (o sin URL, o sin versión) en la foto de un plato."""
    body = api_client.get(reverse('entry-table', args=['burger-house', 'poblado', '8H2KQ7'])).json()
    bebidas, hamburguesas = body['carta']['categorias']
    assert hamburguesas['productos'][0]['foto'] == '/api/v1/burger-house/poblado/fotos/3/?v=20260905010203'
    assert bebidas['productos'][0]['foto'] is None
