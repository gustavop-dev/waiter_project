"""La llamada del comensal llega a Odoo de verdad (pytest -m contract)."""
import pytest

from experience_app.adapters.odoo import pos
from experience_app.adapters.odoo.client import OdooClient, OdooCredentials

pytestmark = pytest.mark.contract
CREDS = OdooCredentials(url='http://192.168.56.10:8069', db='projectapp', login='admin', password='admin', pos_config_id=1)


def test_table_call_round_trips_through_the_addon():
    """Atrapa que set_waiter_call no exista en Odoo o que no anote la hora."""
    client = OdooClient(CREDS)
    [table] = client.call_kw('restaurant.table', 'search_read', [[['active', '=', True]], ['id']], {'limit': 1})
    pos.set_table_call(client, table['id'], 'assist')
    [row] = client.call_kw('restaurant.table', 'read', [[table['id']], ['waiter_call', 'waiter_call_at']])
    assert row['waiter_call'] == 'assist' and row['waiter_call_at']
    pos.set_table_call(client, table['id'], 'none')
