import base64

import pytest

from experience_app.adapters.odoo import pos
from experience_app.adapters.odoo.client import OdooClient, OdooCredentials, OdooUnavailable
from experience_app.adapters.odoo.pos import price_with_taxes
from experience_app.tests.helpers import AUTH, FakeResponse, FakeSession, params

CREDS = OdooCredentials(url='http://odoo', db='bh', login='svc', password='x', pos_config_id=1)
LINE = pos.OrderLine(uuid='l1', product_id=3, name='Angus', unit_price=36900, qty=2, note='sin cebolla', tax_ids=[5])
READ = FakeResponse([{'id': 13, 'pos_reference': '260-1-1', 'state': 'draft', 'amount_total': 87822, 'amount_tax': 14022, 'amount_paid': 0}])
# Forma real de load_data (Odoo 19): description_sale, image_128 e image_origin llegan como False cuando están vacíos.
TEMPLATE = {'list_price': 36900, 'pos_categ_ids': [1], 'taxes_id': [55], 'available_in_pos': True, 'active': True,
            'is_storable': False, 'write_date': '2026-09-05 01:02:03'}
LOAD_DATA = FakeResponse({
    'product.product': [{'id': 3, 'product_tmpl_id': 21}, {'id': 7, 'product_tmpl_id': 22}],
    'product.template': [
        {**TEMPLATE, 'id': 21, 'name': 'Angus', 'is_favorite': True, 'description_sale': 'Carne 200 g', 'image_128': 'iVBORw0KGgo=',
         'image_origin': 'ai'},
        {**TEMPLATE, 'id': 22, 'name': 'Limonada', 'is_favorite': False, 'description_sale': False, 'image_128': False,
         'image_origin': False},
    ],
    'pos.category': [{'id': 1, 'name': 'Carta', 'sequence': 0}], 'res.company': [{'id': 1, 'name': 'Burger House'}],
})
PNG = b'\x89PNG\r\n\x1a\n' + b'x' * 8


def photo_rows(encoded, image_field='image_512'):
    """Lo que search_read devuelve para una plantilla: el campo binario en base64, o False si está vacío."""
    return FakeResponse([{'id': 21, image_field: encoded}])


def test_create_order_syncs_with_uuid_then_recomputes_prices():
    """Atrapa un payload que Odoo rechace o un pedido sin recalcular (total en 0)."""
    http = FakeSession([AUTH, FakeResponse({'pos.order': [{'id': 13}]}), FakeResponse(True), FakeResponse(True), READ])
    order = pos.create_order(OdooClient(CREDS, http), pos_session_id=4, table_id=9, order_uuid='u-1', guests=2, lines=[LINE], date_order='2026-09-05 01:00:00')
    sync = params(http.calls[1])
    assert sync['method'] == 'sync_from_ui'
    assert sync['args'][0][0]['uuid'] == 'u-1'
    assert sync['args'][0][0]['lines'][0][2]['tax_ids'] == [[6, 0, [5]]]
    assert params(http.calls[2])['method'] == 'recompute_prices'
    assert params(http.calls[3])['args'] == [[13], {'waiter_origin': 'diner'}]
    assert order.total == 87822


def test_delivery_order_carries_no_table():
    """Atrapa un pedido a domicilio que Odoo ate a una mesa inexistente."""
    payload = pos.sync_payload(pos_session_id=4, table_id=None, order_uuid='u', guests=1, lines=[], date_order='d')
    assert 'table_id' not in payload


def test_fire_course_skips_when_nothing_is_unsent():
    """Atrapa comandas vacías en cocina por reenviar líneas que ya tenían curso."""
    http = FakeSession([AUTH, FakeResponse([])])
    assert pos.fire_course(OdooClient(CREDS, http), 13) is None
    assert len(http.calls) == 2


def test_read_order_status_derives_kitchen_phase_from_courses():
    """Atrapa "servido" con una comanda todavía en cocina."""
    courses = FakeResponse([{'ready_date': '2026-09-05 01:10:00', 'served_date': False}, {'ready_date': False, 'served_date': False}])
    status = pos.read_order_status(OdooClient(CREDS, FakeSession([AUTH, READ, courses])), 13)
    assert status.kitchen == 'cooking'
    assert status.state == 'draft'


def test_connection_error_becomes_unavailable():
    """Atrapa que una caída de Odoo se trague como error de negocio (el carrito debe conservarse)."""
    import requests

    class Down:
        def post(self, *a, **k):
            raise requests.ConnectionError('down')

    with pytest.raises(OdooUnavailable):
        OdooClient(CREDS, Down()).authenticate()


def test_load_catalog_reads_template_id_description_favorite_photo_flag_and_version():
    """Atrapa una descripción False, un favorito perdido, "tiene foto" con image_128 en False, una foto sin versión o un origen
    de foto que llegue como False en vez de vacío."""
    taxes = FakeResponse([{'id': 55, 'amount': 19.0, 'amount_type': 'percent', 'price_include': False}])
    catalog = pos.load_catalog(OdooClient(CREDS, FakeSession([AUTH, LOAD_DATA, taxes])), 4)
    angus, limonada = catalog.products
    assert (angus.id, angus.template_id) == (3, 21)
    # El precio de lista viaja a Odoo; el final (con el 19% que Odoo suma encima) es el que ve el comensal.
    assert (angus.price, angus.final_price) == (36900, 43911.0)
    assert (angus.description, angus.favorite, angus.has_image) == ('Carne 200 g', True, True)
    assert (limonada.description, limonada.favorite, limonada.has_image) == ('', False, False)
    assert angus.image_version == '20260905010203'
    assert (angus.image_origin, limonada.image_origin) == ('ai', '')


def test_load_catalog_tolerates_an_odoo_without_the_image_origin_field():
    """Atrapa un KeyError con un Odoo donde projectapp_ops aún no se actualizó (-u): la carta debe salir igual, sin origen."""
    raw = FakeResponse({
        'product.product': [{'id': 3, 'product_tmpl_id': 21}],
        'product.template': [{**TEMPLATE, 'id': 21, 'name': 'Angus', 'is_favorite': False, 'description_sale': False, 'image_128': False}],
        'pos.category': [], 'res.company': [],
    })
    catalog = pos.load_catalog(OdooClient(CREDS, FakeSession([AUTH, raw, FakeResponse([])])), 4)
    assert catalog.products[0].image_origin == ''


def test_fetch_product_image_reads_the_template_photo_by_json_rpc():
    """Atrapa una foto pedida por /web/image (placeholder de Odoo), con el id de producto en vez del de plantilla, o mal tipada."""
    http = FakeSession([AUTH, photo_rows(base64.b64encode(PNG).decode())])
    assert pos.fetch_product_image(OdooClient(CREDS, http), 21) == (PNG, 'image/png')
    assert http.calls[0][0] == 'authenticate'
    read = params(http.calls[1])
    assert (read['model'], read['method']) == ('product.template', 'search_read')
    assert read['args'] == [[['id', '=', 21]], ['image_512']]


def test_fetch_product_image_is_none_when_the_template_has_no_photo_or_is_gone():
    """Atrapa el placeholder genérico de Odoo servido como foto: por JSON-RPC el campo vacío es False y la plantilla borrada, []."""
    empty = FakeSession([AUTH, photo_rows(False)])
    gone = FakeSession([AUTH, FakeResponse([])])
    assert pos.fetch_product_image(OdooClient(CREDS, empty), 21) is None
    assert pos.fetch_product_image(OdooClient(CREDS, gone), 21) is None


def test_fetch_product_image_asks_the_dish_size_and_rejects_unknown_ones():
    """Atrapa un tamaño arbitrario que llegue a Odoo, o la pantalla del plato servida con la miniatura de 512 px."""
    http = FakeSession([AUTH, photo_rows(base64.b64encode(PNG).decode(), 'image_1024')])
    assert pos.fetch_product_image(OdooClient(CREDS, http), 21, size='plato') == (PNG, 'image/png')
    assert params(http.calls[1])['args'][1] == ['image_1024']
    with pytest.raises(KeyError):
        pos.fetch_product_image(OdooClient(CREDS, FakeSession([AUTH])), 21, size='image_1920')


def test_image_content_type_sniffs_the_real_format():
    """Atrapa una foto PNG o WebP etiquetada como JPEG: Odoo conserva el formato original en image_512."""
    assert pos.image_content_type(PNG) == 'image/png'
    assert pos.image_content_type(b'\xff\xd8\xff\xe0jpeg') == 'image/jpeg'
    assert pos.image_content_type(b'RIFF\x00\x00\x00\x00WEBPVP8 ') == 'image/webp'
    assert pos.image_content_type(b'GIF89a') == 'image/gif'
    assert pos.image_content_type(b'<html>') == 'application/octet-stream'


def test_fetch_product_image_wraps_a_down_odoo_as_unavailable():
    """Atrapa una caída de Odoo al pedir la foto que salga como 500 en vez de 503 reintentable."""
    import requests

    class Down:
        def post(self, *a, **k):
            raise requests.Timeout('slow')

    client = OdooClient(CREDS, Down())
    client.uid = 2  # ya autenticado: la caída ocurre al leer la foto, no al entrar
    with pytest.raises(OdooUnavailable):
        pos.fetch_product_image(client, 21)




# Falla si la carta muestra la base gravable en vez de lo que el comensal paga (Odoo suma el IVA/INC encima).
def test_final_price_adds_the_taxes_odoo_charges_on_top():
    iva = {'amount': 19.0, 'amount_type': 'percent', 'price_include': False}
    included = {'amount': 8.0, 'amount_type': 'percent', 'price_include': True}
    fixed = {'amount': 500.0, 'amount_type': 'fixed', 'price_include': False}
    assert price_with_taxes(36900.0, [iva]) == 43911.0
    assert price_with_taxes(36900.0, [included]) == 36900.0
    assert price_with_taxes(36900.0, [iva, fixed]) == 44411.0
    assert price_with_taxes(36900.0, []) == 36900.0
