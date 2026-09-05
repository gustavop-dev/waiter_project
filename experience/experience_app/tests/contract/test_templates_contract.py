"""Contratos del Plan H contra el Odoo real del compose (pytest -m contract): fallan hasta `-u projectapp_ops`.

Lo que la experiencia lee por load_data y NO se puede verificar con un simulacro: que pos.config entregue
`signup_discount_percent` (el porcentaje del descuento de primera compra) y product.template `diner_attributes`
(los atributos por plato del Contrato 2), y que una línea con `discount` la acepte sync_from_ui.
"""
import json
import uuid

import pytest

from experience_app.adapters.odoo import pos
from experience_app.adapters.odoo.client import OdooClient, OdooCredentials

pytestmark = pytest.mark.contract
CREDS = OdooCredentials(url='http://192.168.56.10:8069', db='projectapp', login='admin', password='admin', pos_config_id=1)


@pytest.fixture
def client():
    return OdooClient(CREDS)


@pytest.fixture
def template_with_attributes(client):
    """Escribe atributos en una plantilla del POS y los retira al salir: el contrato no depende de datos sembrados."""
    [tpl] = client.call_kw('product.template', 'search_read', [[['available_in_pos', '=', True], ['name', 'ilike', 'Angus']], ['id', 'diner_attributes']], {'limit': 1})
    client.call_kw('product.template', 'write', [[tpl['id']], {'diner_attributes': json.dumps({'picante': 2, 'etiquetas': ['popular']})}])
    yield tpl['id']
    client.call_kw('product.template', 'write', [[tpl['id']], {'diner_attributes': tpl['diner_attributes'] or False}])


def test_load_data_carries_the_signup_discount_and_the_diner_attributes(client, template_with_attributes):
    """Atrapa un addon sin signup_discount_percent en pos.config o sin diner_attributes en product.template (o fuera de
    _load_pos_data_fields): la carta saldría sin atributos y el descuento sería siempre el del diseño."""
    session_id = pos.ensure_open_session(client, CREDS.pos_config_id)
    raw = client.call_kw('pos.session', 'load_data', [[session_id], []])
    assert 'signup_discount_percent' in raw['pos.config'][0]
    assert 'diner_attributes' in raw['product.template'][0]
    catalog = pos.load_catalog(client, session_id)
    assert 0 <= catalog.signup_discount_percent <= 100
    angus = next(p for p in catalog.products if p.template_id == template_with_attributes)
    assert angus.attributes == {'picante': 2, 'etiquetas': ['popular']}


def test_a_line_with_discount_is_accepted_and_reduces_the_total(client):
    """Atrapa un sync_from_ui que ignore `discount` (el comensal vería un descuento que Odoo no cobra)."""
    session_id = pos.ensure_open_session(client, CREDS.pos_config_id)
    catalog = pos.load_catalog(client, session_id)
    angus = next(p for p in catalog.products if 'Angus' in p.name)
    line = pos.OrderLine(uuid=str(uuid.uuid4()), product_id=angus.id, name=angus.name, unit_price=angus.price, qty=2, note='', tax_ids=angus.tax_ids, discount=5.0)
    order = pos.create_order(client, pos_session_id=session_id, table_id=None, order_uuid=str(uuid.uuid4()), guests=1, lines=[line], date_order='2026-09-05 01:00:00')
    assert order.total == round(87822 * 0.95, 2)
    pos.pay_order(client, order.id, pos.cash_payment_method_id(client), order.total)
