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


def photo_url(product_id):
    return f'/fotos/{product_id}/'


def test_menu_view_groups_products_by_category_in_pos_order():
    """Atrapa productos huérfanos, categorías fuera del orden del POS o un plato sin descripción, favorito o foto."""
    menu = catalog.menu_view(CATALOG, photo_url)
    assert [c['nombre'] for c in menu['categorias']] == ['Bebidas', 'Hamburguesas']
    assert menu['categorias'][1]['productos'][0] == {
        'id': 3, 'nombre': 'Hamburguesa Angus', 'precio': 36900.0, 'agotado': False, 'categorias': [2],
        'descripcion': 'Carne angus 200 g, queso madurado', 'favorito': True, 'foto': '/fotos/3/',
    }


def test_menu_view_gives_no_photo_url_to_products_without_image():
    """Atrapa una URL de foto para un plato sin imagen: el comensal vería un hueco roto en cada tarjeta."""
    limonada = catalog.menu_view(CATALOG, photo_url)['categorias'][0]['productos'][0]
    assert limonada['foto'] is None
    assert (limonada['descripcion'], limonada['favorito']) == ('', False)
