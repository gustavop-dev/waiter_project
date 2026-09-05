import base64

from experience_app.adapters.odoo import pos
from experience_app.adapters.odoo.client import OdooClient, OdooCredentials
from experience_app.tests.helpers import AUTH, FakeResponse, FakeSession, params

CREDS = OdooCredentials(url='http://odoo', db='bh', login='svc', password='x', pos_config_id=1)
# Forma real de search_read en res.company: los campos vacíos llegan como False y, con bin_size, el binario como tamaño.
UNTOUCHED = {'id': 1, 'name': 'Burger House', 'brand_color': False, 'brand_font': False, 'brand_radius': False, 'brand_tagline': False,
             'brand_greeting': False, 'brand_waiter_name': False, 'brand_welcome': False, 'brand_logo': False, 'write_date': '2026-09-05 01:02:03'}
EDITED = {**UNTOUCHED, 'brand_color': '#7A2E2A', 'brand_font': 'Fraunces', 'brand_radius': '24', 'brand_tagline': 'Cocina de barrio',
          'brand_greeting': 'Buenas noches', 'brand_waiter_name': 'Alex', 'brand_welcome': '¿Qué te provoca hoy?', 'brand_logo': '12.5 Kb'}
PNG = b'\x89PNG\r\n\x1a\n' + b'x' * 8
SVG = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'


def test_read_company_brand_normalizes_false_to_empty_and_asks_for_the_size_not_the_logo():
    """Atrapa un False de Odoo colado como texto ('False' en el saludo), un radio en texto, o el logo descargado en cada refresco."""
    http = FakeSession([AUTH, FakeResponse([UNTOUCHED])])
    company = pos.read_company_brand(OdooClient(CREDS, http))
    assert company == pos.CompanyBrand(name='Burger House', color='', font='', radius=None, tagline='', greeting='', waiter_name='',
                                       welcome='', has_logo=False, version='20260905010203')
    call = params(http.calls[1])
    assert (call['model'], call['method']) == ('res.company', 'search_read')
    assert call['kwargs'] == {'limit': 1, 'context': {'bin_size': True}}
    assert set(pos.BRAND_FIELDS) <= set(call['args'][1])


def test_read_company_brand_keeps_what_the_restaurant_edited():
    """Atrapa un campo editado que no llegue, un radio sin convertir a entero o "hay logo" en False con logo presente."""
    company = pos.read_company_brand(OdooClient(CREDS, FakeSession([AUTH, FakeResponse([EDITED])])))
    assert (company.color, company.font, company.radius) == ('#7A2E2A', 'Fraunces', 24)
    assert (company.tagline, company.greeting, company.waiter_name, company.welcome) == ('Cocina de barrio', 'Buenas noches', 'Alex', '¿Qué te provoca hoy?')
    assert company.has_logo is True


def test_read_company_brand_survives_a_database_without_company():
    """Atrapa un IndexError en una base recién creada: la marca debe caer al registro, no a un 500."""
    company = pos.read_company_brand(OdooClient(CREDS, FakeSession([AUTH, FakeResponse([])])))
    assert company.name == '' and company.has_logo is False and company.version == ''


def test_fetch_company_logo_decodes_a_raster_and_reports_its_real_type():
    """Atrapa un logo PNG servido como JPEG, o pedido con bin_size (llegaría el tamaño y no los bytes)."""
    http = FakeSession([AUTH, FakeResponse([{'id': 1, 'brand_logo': base64.b64encode(PNG).decode()}])])
    assert pos.fetch_company_logo(OdooClient(CREDS, http)) == (PNG, 'image/png')
    assert 'context' not in params(http.calls[1])['kwargs']


def test_fetch_company_logo_refuses_anything_that_is_not_png_jpeg_or_gif():
    """Atrapa un SVG (o un WebP, o un HTML) servido inline desde nuestro origen: podría ejecutar script."""
    encoded = base64.b64encode(SVG).decode()
    assert pos.fetch_company_logo(OdooClient(CREDS, FakeSession([AUTH, FakeResponse([{'id': 1, 'brand_logo': encoded}])]))) is None
    webp = base64.b64encode(b'RIFF\x00\x00\x00\x00WEBPVP8 ').decode()
    assert pos.fetch_company_logo(OdooClient(CREDS, FakeSession([AUTH, FakeResponse([{'id': 1, 'brand_logo': webp}])]))) is None


def test_fetch_company_logo_is_none_when_odoo_has_no_logo():
    """Atrapa un base64 de 'False' decodificado como imagen."""
    assert pos.fetch_company_logo(OdooClient(CREDS, FakeSession([AUTH, FakeResponse([{'id': 1, 'brand_logo': False}])]))) is None
    assert pos.fetch_company_logo(OdooClient(CREDS, FakeSession([AUTH, FakeResponse([])]))) is None
