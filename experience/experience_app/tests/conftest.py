from unittest.mock import patch

import pytest
from django.core.cache import cache
from rest_framework.test import APIClient

from experience_app.adapters.odoo.client import OdooCredentials
from experience_app.adapters.odoo.pos import Catalog, Category, Product
from experience_app.adapters.registry.client import Tenant

ODOO = OdooCredentials(url='http://odoo', db='bh', login='svc', password='x', pos_config_id=1)
BRAND = {'color': '#7A2E2A', 'colorTexto': '#FFFFFF', 'colorSuave': '#F2EAEA', 'fuente': 'Fraunces', 'radio': 14, 'lema': 'Cocina de barrio', 'saludo': '', 'mesero': 'Alex', 'bienvenida': '¿Qué te provoca hoy?', 'logo': None}
TABLE = Tenant('burger-house', 'Burger House', 'poblado', 'Poblado', '8H2KQ7', 8, 9, ODOO, BRAND)
DELIVERY = Tenant('burger-house', 'Burger House', 'poblado', 'Poblado', None, None, None, ODOO)
# template_id distinto del id: atrapa a quien pida la foto con el id del producto en vez del de la plantilla.
ANGUS = Product(id=3, name='Hamburguesa Angus', price=36900.0, category_ids=[2], tax_ids=[5],
                template_id=21, description='Carne angus 200 g, queso madurado', favorite=True, has_image=True)
LIMONADA = Product(id=7, name='Limonada de Coco', price=9900.0, category_ids=[1], tax_ids=[5],
                   template_id=22, description='', favorite=False, has_image=False)
CATALOG = Catalog(company_name='Burger House', products=[ANGUS, LIMONADA], categories=[Category(1, 'Bebidas', 1), Category(2, 'Hamburguesas', 2)])


@pytest.fixture(autouse=True)
def clear_cache():
    cache.clear()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def table_tenant():
    with patch('experience_app.views.sessions.resolve', return_value=TABLE), patch('experience_app.views.context.resolve', return_value=TABLE):
        yield TABLE


@pytest.fixture
def catalog_stub():
    with patch('experience_app.services.catalog.get_catalog', return_value=CATALOG):
        yield CATALOG


@pytest.fixture
def two_diners(db):
    from experience_app.services.sessions import open_session
    session, ana = open_session(TABLE, None)
    _, beto = open_session(TABLE, None)
    return session, ana, beto
