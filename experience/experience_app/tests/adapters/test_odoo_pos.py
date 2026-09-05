import pytest

from experience_app.adapters.odoo import pos
from experience_app.adapters.odoo.client import OdooClient, OdooCredentials, OdooUnavailable
from experience_app.tests.helpers import AUTH, FakeResponse, FakeSession, params

CREDS = OdooCredentials(url='http://odoo', db='bh', login='svc', password='x', pos_config_id=1)
LINE = pos.OrderLine(uuid='l1', product_id=3, name='Angus', unit_price=36900, qty=2, note='sin cebolla', tax_ids=[5])
READ = FakeResponse([{'id': 13, 'pos_reference': '260-1-1', 'state': 'draft', 'amount_total': 87822, 'amount_tax': 14022, 'amount_paid': 0}])
# Forma real de load_data (Odoo 19): description_sale e image_128 llegan como False cuando están vacíos.
TEMPLATE = {'list_price': 36900, 'pos_categ_ids': [1], 'taxes_id': [55], 'available_in_pos': True, 'active': True, 'is_storable': False}
LOAD_DATA = FakeResponse({
    'product.product': [{'id': 3, 'product_tmpl_id': 21}, {'id': 7, 'product_tmpl_id': 22}],
    'product.template': [
        {**TEMPLATE, 'id': 21, 'name': 'Angus', 'is_favorite': True, 'description_sale': 'Carne 200 g', 'image_128': 'iVBORw0KGgo='},
        {**TEMPLATE, 'id': 22, 'name': 'Limonada', 'is_favorite': False, 'description_sale': False, 'image_128': False},
    ],
    'pos.category': [{'id': 1, 'name': 'Carta', 'sequence': 0}], 'res.company': [{'id': 1, 'name': 'Burger House'}],
})


class RawImage:
    def __init__(self, content=b'', status_code=200, content_type='image/jpeg'):
        self.content, self.status_code, self.headers = content, status_code, {'Content-Type': content_type}


class ImageSession(FakeSession):
    """FakeSession que además atiende GET (la foto va por /web/image, no por JSON-RPC)."""

    def __init__(self, responses, image):
        super().__init__(responses)
        self.image, self.gets = image, []

    def get(self, url, timeout=None):
        self.gets.append(url)
        return self.image


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


def test_load_catalog_reads_template_id_description_favorite_and_photo_flag():
    """Atrapa una descripción False, un favorito perdido o "tiene foto" con image_128 en False."""
    catalog = pos.load_catalog(OdooClient(CREDS, FakeSession([AUTH, LOAD_DATA])), 4)
    angus, limonada = catalog.products
    assert (angus.id, angus.template_id) == (3, 21)
    assert (angus.description, angus.favorite, angus.has_image) == ('Carne 200 g', True, True)
    assert (limonada.description, limonada.favorite, limonada.has_image) == ('', False, False)


def test_fetch_product_image_authenticates_and_streams_the_template_photo():
    """Atrapa una foto pedida sin sesión (Odoo devuelve el login) o con el id de producto en vez del de plantilla."""
    http = ImageSession([AUTH], RawImage(b'\xff\xd8jpeg'))
    assert pos.fetch_product_image(OdooClient(CREDS, http), 21) == b'\xff\xd8jpeg'
    assert http.calls[0][0] == 'authenticate'
    assert http.gets == ['http://odoo/web/image/product.template/21/image_512']


def test_fetch_product_image_is_none_for_errors_and_non_images():
    """Atrapa un 404 o el HTML del login de Odoo servidos al comensal como si fueran la foto."""
    missing = ImageSession([AUTH], RawImage(b'not found', status_code=404))
    login_page = ImageSession([AUTH], RawImage(b'<html>', status_code=200, content_type='text/html; charset=utf-8'))
    assert pos.fetch_product_image(OdooClient(CREDS, missing), 21) is None
    assert pos.fetch_product_image(OdooClient(CREDS, login_page), 21) is None


def test_fetch_product_image_wraps_a_down_odoo_as_unavailable():
    """Atrapa una caída de Odoo al pedir la foto que salga como 500 en vez de 503 reintentable."""
    import requests

    class Down(ImageSession):
        def get(self, *a, **k):
            raise requests.Timeout('slow')

    with pytest.raises(OdooUnavailable):
        pos.fetch_product_image(OdooClient(CREDS, Down([AUTH], None)), 21)
