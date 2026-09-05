from unittest.mock import patch

from experience_app.services import catalog
from experience_app.tests.conftest import CATALOG, TABLE


@patch('experience_app.services.catalog.pos.load_catalog', return_value=CATALOG)
@patch('experience_app.services.catalog.pos.ensure_open_session', return_value=4)
@patch('experience_app.services.catalog.OdooClient')
def test_catalog_hits_odoo_once_until_invalidated(client, ensure, load):
    """Atrapa una carta que golpea Odoo en cada comensal, o una invalidación que no invalida."""
    catalog.get_catalog(TABLE)
    catalog.get_catalog(TABLE)
    assert load.call_count == 1
    catalog.invalidate('burger-house', 'poblado')
    catalog.get_catalog(TABLE)
    assert load.call_count == 2


def test_menu_view_groups_products_by_category_in_pos_order():
    """Atrapa productos huérfanos o categorías fuera del orden del POS."""
    menu = catalog.menu_view(CATALOG)
    assert [c['nombre'] for c in menu['categorias']] == ['Bebidas', 'Hamburguesas']
    assert menu['categorias'][1]['productos'][0] == {'id': 3, 'nombre': 'Hamburguesa Angus', 'precio': 36900.0, 'agotado': False, 'categorias': [2]}
