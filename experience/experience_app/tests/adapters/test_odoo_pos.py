import pytest

from experience_app.adapters.odoo import pos
from experience_app.adapters.odoo.client import OdooClient, OdooCredentials, OdooUnavailable
from experience_app.tests.helpers import AUTH, FakeResponse, FakeSession, params

CREDS = OdooCredentials(url='http://odoo', db='bh', login='svc', password='x', pos_config_id=1)
LINE = pos.OrderLine(uuid='l1', product_id=3, name='Angus', unit_price=36900, qty=2, note='sin cebolla', tax_ids=[5])
READ = FakeResponse([{'id': 13, 'pos_reference': '260-1-1', 'state': 'draft', 'amount_total': 87822, 'amount_tax': 14022, 'amount_paid': 0}])


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
