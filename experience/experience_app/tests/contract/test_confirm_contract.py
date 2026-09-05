"""Confirmación real: mismo pos.order al pedir más, y una comanda por confirmación (pytest -m contract)."""
from unittest.mock import patch

import pytest

from experience_app.adapters.odoo import pos
from experience_app.adapters.odoo.client import OdooClient, OdooCredentials
from experience_app.adapters.registry.client import Tenant
from experience_app.services import catalog, orders, sessions

pytestmark = pytest.mark.contract
CREDS = OdooCredentials(url='http://192.168.56.10:8069', db='projectapp', login='admin', password='admin', pos_config_id=1)
TENANT = Tenant('burger-house', 'Burger House', 'poblado', 'Poblado', None, None, None, CREDS)


@pytest.mark.django_db
@patch('experience_app.services.orders.resolve', return_value=TENANT)
def test_second_confirmation_adds_lines_to_the_same_odoo_order_and_fires_another_course(resolve):
    """Atrapa un segundo pedido de la misma mesa que aparezca como otro pos.order en el salón."""
    products = catalog.get_catalog(TENANT).products  # la carta REAL: ids e impuestos del Odoo del compose
    session, diner = sessions.open_session(TENANT, None)
    sessions.add_line(session, diner, next(p for p in products if 'Angus' in p.name), qty=2)
    first, _ = orders.confirm(session)
    sessions.add_line(session, diner, next(p for p in products if 'Limonada' in p.name), qty=1)
    second, _ = orders.confirm(session)
    assert first.id == second.id
    assert second.odoo_order_id == first.odoo_order_id
    assert float(second.total) > float(first.total)
    client = OdooClient(CREDS)
    courses = client.call_kw('restaurant.order.course', 'search_read', [[['order_id', '=', second.odoo_order_id]], ['id']])
    assert len(courses) == 2
    pos.pay_order(client, second.odoo_order_id, pos.cash_payment_method_id(client), float(second.total))
