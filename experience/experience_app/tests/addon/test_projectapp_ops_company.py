"""Lógica de marca del addon projectapp_ops (odoo/addons/projectapp_ops/models/company.py) sin un Odoo instalado.

Odoo no está en este venv, así que company.py se carga con un paquete `odoo` falso (campos, decoradores y excepciones
mínimos) y un recordset falso. Esto cubre las reglas puras de write_brand y de la constraint del logo; lo que solo Odoo
puede decir (que el rol admin no puede usar `write` y sí `write_brand`) vive en odoo/addons/projectapp_ops/tests/.
"""
import base64
import importlib.util
import sys
import types
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch

import pytest

REPO = Path(__file__).resolve().parents[4]
COMPANY_PY = REPO / 'odoo' / 'addons' / 'projectapp_ops' / 'models' / 'company.py'
PNG = b'\x89PNG\r\n\x1a\n' + b'x' * 8
JPEG = b'\xff\xd8\xff\xe0' + b'x' * 12
GIF = b'GIF89a' + b'x' * 10
SVG = b'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'


def _fake_odoo():
    """Lo justo de `odoo` para que company.py se importe: la lógica de negocio no usa nada más."""
    class _Field:
        def __init__(self, *args, **kwargs):
            pass

    class AccessError(Exception):
        pass

    class ValidationError(Exception):
        pass

    fields = types.ModuleType('odoo.fields')
    for name in ('Char', 'Selection', 'Binary'):
        setattr(fields, name, _Field)
    api = types.ModuleType('odoo.api')
    api.constrains = lambda *names: (lambda f: f)
    api.model = lambda f: f
    models = types.ModuleType('odoo.models')
    models.Model = type('Model', (), {})
    exceptions = types.ModuleType('odoo.exceptions')
    exceptions.AccessError, exceptions.ValidationError = AccessError, ValidationError
    odoo = types.ModuleType('odoo')
    odoo._ = lambda msg, *args: msg % args if args else msg
    odoo.api, odoo.fields, odoo.models, odoo.exceptions = api, fields, models, exceptions
    return {'odoo': odoo, 'odoo.api': api, 'odoo.fields': fields, 'odoo.models': models, 'odoo.exceptions': exceptions}


@pytest.fixture(scope='module')
def company_py():
    with patch.dict(sys.modules, _fake_odoo()):
        spec = importlib.util.spec_from_file_location('projectapp_ops_company', COMPANY_PY)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
    return module


class FakeCompany:
    """Lo mínimo de un recordset de res.company que usan write_brand y la constraint del logo."""

    def __init__(self, *, pos_manager=True, brand_logo=False):
        self.brand_logo = brand_logo
        self.written = []
        self.sudo_used = False
        user = SimpleNamespace(has_group=lambda xmlid: pos_manager and xmlid == 'point_of_sale.group_pos_manager')
        self.env = SimpleNamespace(user=user, company=self)

    def sudo(self):
        self.sudo_used = True
        return self

    def write(self, vals):
        self.written.append(vals)
        return True

    def with_context(self, **context):
        self.context = context
        return [self]


def b64(data: bytes) -> str:
    return base64.b64encode(data).decode()


def test_write_brand_refuses_anyone_who_is_not_a_pos_manager(company_py):
    """Atrapa un mesero (o cajero) cambiando la marca del restaurante: el rol admin es el único que puede."""
    company = FakeCompany(pos_manager=False)
    with pytest.raises(company_py.AccessError, match='Solo un administrador puede cambiar la marca'):
        company_py.ResCompany.write_brand(company, {'brand_color': '#7A2E2A'})
    assert company.written == []


def test_write_brand_cleans_the_texts_and_writes_with_sudo_on_the_users_company(company_py):
    """Atrapa el AccessError de res.company.write para el rol admin (sin base.group_erp_manager), y textos sin recortar."""
    company = FakeCompany()
    vals = {'brand_color': ' #7a2e2a ', 'brand_font': 'Lora', 'brand_radius': 14, 'brand_tagline': '  Cocina de barrio ',
            'brand_greeting': '   ', 'brand_waiter_name': None, 'brand_welcome': False, 'brand_logo': b64(PNG)}
    assert company_py.ResCompany.write_brand(company, vals) is True
    assert company.written == [{'brand_color': '#7A2E2A', 'brand_font': 'Lora', 'brand_radius': '14', 'brand_tagline': 'Cocina de barrio',
                                'brand_greeting': False, 'brand_waiter_name': False, 'brand_welcome': False, 'brand_logo': b64(PNG)}]
    assert company.sudo_used


@pytest.mark.parametrize('vals', [
    {'name': 'Otro nombre'},                                # un campo de la compañía que no es de la marca
    {'brand_color': '#000000', 'user_ids': [(5,)]},         # una clave de más junto a una válida
    {'brand_colour': '#000000'},                            # una clave mal escrita no se ignora en silencio
    'brand_color=#000000',                                  # ni siquiera un diccionario
])
def test_write_brand_only_accepts_the_closed_list_of_brand_fields(company_py, vals):
    """Atrapa un sudo() que deje escribir cualquier campo de res.company (nombre, usuarios, moneda...) por la puerta de la marca."""
    company = FakeCompany()
    with pytest.raises(company_py.ValidationError):
        company_py.ResCompany.write_brand(company, vals)
    assert company.written == []


@pytest.mark.parametrize('vals', [{'brand_color': '#12345'}, {'brand_color': 'rojo'}, {'brand_font': 'Comic Sans'}, {'brand_radius': '9'},
                                  {'brand_tagline': 12.5}])
def test_write_brand_validates_color_font_and_radius_before_writing(company_py, vals):
    """Atrapa un color que rompa el CSS del comensal o una fuente/radio fuera de la lista cerrada (§06)."""
    company = FakeCompany()
    with pytest.raises(company_py.ValidationError):
        company_py.ResCompany.write_brand(company, vals)
    assert company.written == []


@pytest.mark.parametrize('empty', [False, None, ''])
def test_write_brand_removes_the_logo_with_an_empty_value(company_py, empty):
    """Atrapa un "quitar logo" que deje el logo viejo (o guarde 'None' como base64)."""
    company = FakeCompany()
    company_py.ResCompany.write_brand(company, {'brand_logo': empty})
    assert company.written == [{'brand_logo': False}]


@pytest.mark.parametrize('data', [PNG, JPEG, GIF])
def test_logo_constraint_accepts_rasters_and_sniffs_only_the_first_bytes(company_py, data):
    """Atrapa una constraint que decodifique los 2 MB enteros para mirar cuatro bytes (Odoo la corre en cada escritura)."""
    # Odoo entrega el Binary como bytes base64, no como str.
    company = FakeCompany(brand_logo=base64.b64encode(data + b'\0' * 100_000))
    with patch('base64.b64decode', wraps=base64.b64decode) as decode:
        company_py.ResCompany._check_brand_logo(company)
    assert company.context == {'bin_size': False}
    assert [len(call.args[0]) for call in decode.call_args_list] == [company_py.SNIFF_CHARS]


def test_logo_constraint_rejects_svg_and_anything_not_raster(company_py):
    """Atrapa un SVG guardado como logo: servido inline desde el origen del comensal podría ejecutar script."""
    for bad in (SVG, b'RIFF\0\0\0\0WEBPVP8 ', b'not an image at all'):
        with pytest.raises(company_py.ValidationError, match='PNG, JPEG o GIF'):
            company_py.ResCompany._check_brand_logo(FakeCompany(brand_logo=b64(bad)))
    company_py.ResCompany._check_brand_logo(FakeCompany(brand_logo=False))  # sin logo: nada que validar


def test_logo_constraint_rejects_more_than_2_mb_decoded_without_decoding(company_py):
    """Atrapa un logo de 10 MB en ir.attachment que experience/ luego se niega a servir (el administrador no vería el porqué)."""
    too_big = b64(PNG + b'\0' * (2_000_001 - len(PNG)))
    with patch('base64.b64decode', wraps=base64.b64decode) as decode, pytest.raises(company_py.ValidationError, match='2 MB'):
        company_py.ResCompany._check_brand_logo(FakeCompany(brand_logo=too_big))
    assert decode.call_count == 0
    # Justo en el tope pasa: el límite es inclusivo y el mismo que aplica experience/ (MAX_LOGO_BYTES).
    company_py.ResCompany._check_brand_logo(FakeCompany(brand_logo=b64(PNG + b'\0' * (2_000_000 - len(PNG)))))


def test_size_cap_matches_experience(company_py):
    """Atrapa un tope distinto en el addon y en la experiencia: un logo aceptado en el POS que el comensal no vería."""
    from experience_app.utils import images
    assert company_py.MAX_LOGO_BYTES == images.MAX_LOGO_BYTES
    for data in (b'', b'a', b'ab', b'abc', PNG, PNG + b'\0' * 1_999_985):
        assert company_py.decoded_size(b64(data)) == images.decoded_size(b64(data)) == len(data)
