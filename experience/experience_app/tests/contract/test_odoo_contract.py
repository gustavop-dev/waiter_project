"""Contratos contra el Odoo real del compose (pytest -m contract). Fallan si Odoo no responde."""
import uuid

import pytest

from experience_app.adapters.odoo import pos
from experience_app.adapters.odoo.client import OdooClient, OdooCredentials

pytestmark = pytest.mark.contract
CREDS = OdooCredentials(url='http://192.168.56.10:8069', db='projectapp', login='admin', password='admin', pos_config_id=1)
# Claves de product.template en load_data de las que depende la carta del comensal (foto, descripción, recomendado, versión).
MENU_KEYS = {'image_128', 'description_sale', 'is_favorite', 'write_date', 'image_origin'}


@pytest.fixture
def client():
    return OdooClient(CREDS)


def test_same_uuid_twice_updates_instead_of_duplicating(client):
    """Atrapa pedidos duplicados cuando el móvil reintenta la confirmación."""
    session_id = pos.ensure_open_session(client, CREDS.pos_config_id)
    catalog = pos.load_catalog(client, session_id)
    angus = next(p for p in catalog.products if 'Angus' in p.name)
    line = pos.OrderLine(uuid=str(uuid.uuid4()), product_id=angus.id, name=angus.name, unit_price=angus.price, qty=2, note='', tax_ids=angus.tax_ids)
    kw = {'pos_session_id': session_id, 'table_id': None, 'order_uuid': str(uuid.uuid4()), 'guests': 1, 'lines': [line], 'date_order': '2026-09-05 01:00:00'}
    first = pos.create_order(client, **kw)
    second = pos.create_order(client, **kw)
    assert first.id == second.id
    assert first.total == 87822
    assert pos.fire_course(client, first.id) is not None
    assert pos.fire_course(client, first.id) is None
    assert pos.read_order_status(client, first.id).kitchen == 'received'
    pos.pay_order(client, first.id, pos.cash_payment_method_id(client), first.total)
    assert pos.read_order_status(client, first.id).state == 'paid'


PNG_1PX = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='


@pytest.fixture
def template_with_photo(client):
    """Escribe un PNG de 1 px en una plantilla del POS y lo retira al salir: el contrato no depende de datos sembrados."""
    [tpl] = client.call_kw('product.template', 'search_read', [[['available_in_pos', '=', True], ['name', 'ilike', 'Angus']], ['id']], {'limit': 1})
    client.call_kw('product.template', 'write', [[tpl['id']], {'image_1920': PNG_1PX}])
    yield tpl['id']
    client.call_kw('product.template', 'write', [[tpl['id']], {'image_1920': False}])


def test_load_data_carries_photo_description_favorite_and_version(client, template_with_photo):
    """Atrapa un load_data sin image_128, description_sale, is_favorite o write_date: la carta saldría sin fotos, sin
    descripciones ni recomendados y con la URL de la foto sin versión, y ningún test unitario lo notaría. Atrapa también
    el placeholder genérico de Odoo servido como foto de una plantilla inexistente."""
    session_id = pos.ensure_open_session(client, CREDS.pos_config_id)
    raw = client.call_kw('pos.session', 'load_data', [[session_id], []])
    assert MENU_KEYS <= raw['product.template'][0].keys()
    catalog = pos.load_catalog(client, session_id)
    assert all(p.image_version for p in catalog.products)
    with_photo = next(p for p in catalog.products if p.template_id == template_with_photo)
    assert with_photo.has_image
    data, content_type = pos.fetch_product_image(client, with_photo.template_id)
    assert content_type == 'image/png'
    assert len(data) > 0
    assert pos.fetch_product_image(client, 999999) is None
