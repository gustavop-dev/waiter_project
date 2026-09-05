"""Contratos contra el Odoo real del compose (pytest -m contract). Fallan si Odoo no responde."""
import uuid

import pytest

from experience_app.adapters.odoo import pos
from experience_app.adapters.odoo.client import OdooClient, OdooCredentials

pytestmark = pytest.mark.contract
CREDS = OdooCredentials(url='http://192.168.56.10:8069', db='projectapp', login='admin', password='admin', pos_config_id=1)


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
    assert pos.read_order_status(client, first.id).kitchen == 'cooking'
    pos.pay_order(client, first.id, pos.cash_payment_method_id(client), first.total)
    assert pos.read_order_status(client, first.id).state == 'paid'
