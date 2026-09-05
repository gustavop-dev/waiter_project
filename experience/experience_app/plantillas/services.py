"""La plantilla que ve el comensal (Contrato 3 del Plan H) y los ajustes por sede que la producen.

Precedencia de los tokens, de menor a mayor:

    spec.tokens (el diseño)  ←  marca del Plan G (acento = color, displayFont = tipografía, radios = redondeo)
                             ←  paleta y tipografía de la sede (solo los tokens que `personalizable` permite)

Cuando el acento final no es el del diseño se recalculan `acentoTinta` (utils/brand.ink_for, contraste ≥ 4.5) y
`acentoSuave` (10 % del acento sobre el fondo de la plantilla; sobre blanco coincide con utils/brand.soft_for).

La plantilla resuelta se cachea TEMPLATE_CACHE_SECONDS (60 s por defecto) por sede y se invalida al guardar desde el POS
y con el aviso interno de "algo cambió en Odoo" (views/internal.py). Sin ajustes de sede se resuelve `B1`; sin B1 en el
catálogo, la primera plantilla disponible; con el catálogo vacío, el spec embebido (defaults.FALLBACK_SPEC): el comensal
nunca se queda sin tokens.
"""
import re
from copy import deepcopy

from django.conf import settings
from django.core.cache import cache
from django.urls import reverse

from experience_app.adapters.registry.client import Tenant
from experience_app.plantillas.defaults import (
    DEFAULT_CODE,
    FALLBACK_SPEC,
    FAMILIES,
    LAYOUT_SCREENS,
    PATTERN_SCREENS,
    SCREENS,
)
from experience_app.plantillas.models import MenuTemplate, VenueMenuSettings
from experience_app.plantillas.seed import thumbnail_path
from experience_app.services import brand, discount
from experience_app.utils.brand import FONTS, RADII, contrast, ink_for

COLOR_RE = re.compile(r'^#[0-9A-Fa-f]{6}$')
MIN_CONTRAST = 4.5
# Un radio de 100 px o más es una píldora (999 en los specs): no se escala con el redondeo de la marca.
PILL_RADIUS = 100
# Claves del spec que no salen en el catálogo público: son notas para quien implementa el layout, no datos del comensal.
PRIVATE_SCREEN_KEYS = ('resumen', 'estructura')


class InvalidSettings(Exception):
    """El PUT interno trae algo que el catálogo no admite; el mensaje va tal cual al POS (en español)."""


def _key(restaurant: str, venue: str) -> str:
    return f'template:{restaurant}/{venue}'


def invalidate(restaurant: str, venue: str) -> None:
    cache.delete(_key(restaurant, venue))


# ---- catálogo -----------------------------------------------------------------------------------------------------
def default_template() -> MenuTemplate | None:
    return MenuTemplate.objects.filter(code=DEFAULT_CODE).first() or MenuTemplate.objects.order_by('sort', 'code').first()


def default_code() -> str:
    template = default_template()
    return template.code if template else DEFAULT_CODE


def thumbnail_url(code: str) -> str | None:
    return reverse('template-thumbnail', args=[code]) if thumbnail_path(code) else None


def public_spec(template: MenuTemplate) -> dict:
    spec = deepcopy(template.spec)
    spec['pantallas'] = {screen: {k: v for k, v in data.items() if k not in PRIVATE_SCREEN_KEYS}
                         for screen, data in spec.get('pantallas', {}).items()}
    spec['miniatura'] = thumbnail_url(template.code)
    return spec


def catalog_view() -> dict:
    templates = list(MenuTemplate.objects.order_by('sort', 'code'))
    families = {**FAMILIES, **{t.family: t.spec.get('familiaNombre') for t in templates if t.spec.get('familiaNombre')}}
    return {'familias': families, 'plantillas': [public_spec(t) for t in templates]}


# ---- tokens finales -----------------------------------------------------------------------------------------------
def _mix_over(accent: str, background: str, amount: float = 0.10) -> str:
    def channel(i):
        a, b = int(accent[i:i + 2], 16), int(background[i:i + 2], 16)
        return round(b + (a - b) * amount)
    return '#' + ''.join(f'{channel(i):02X}' for i in (1, 3, 5))


def _scaled_radii(tokens: dict, radius: int) -> dict:
    """El redondeo de la marca fija la tarjeta; botón y chip conservan la proporción del diseño (las píldoras no cambian)."""
    base = tokens.get('radioTarjeta') or 0
    out = {'radioTarjeta': radius}
    for key in ('radioBoton', 'radioChip'):
        value = tokens.get(key)
        if isinstance(value, int | float) and value < PILL_RADIUS:
            out[key] = round(value * radius / base) if base else radius
    return out


def final_tokens(spec: dict, brand_inputs: dict, palette: dict, typography: dict) -> dict:
    tokens = dict(spec['tokens'])
    customizable = spec.get('personalizable', {})
    color, font, radius = brand_inputs.get('color') or '', brand_inputs.get('fuente') or '', brand_inputs.get('radio')
    if color and COLOR_RE.match(color):
        tokens['acento'] = color.upper()
    if font in FONTS:
        tokens['displayFont'] = font
    if radius in RADII:
        tokens.update(_scaled_radii(tokens, radius))
    for key in customizable.get('colores', []):
        value = palette.get(key)
        if isinstance(value, str) and COLOR_RE.match(value):
            tokens[key] = value.upper()
    display = typography.get('display')
    if display and customizable.get('tipografiaDisplay', True):
        tokens['displayFont'] = display
    if tokens['acento'] != spec['tokens']['acento']:
        tokens['acentoTinta'] = ink_for(tokens['acento'])
        tokens['acentoSuave'] = _mix_over(tokens['acento'], tokens.get('fondo', '#FFFFFF'))
    return tokens


def _google_fonts(spec: dict, tokens: dict) -> list[str]:
    fonts = list(spec.get('fuentesGoogle', []))
    designed, final = spec['tokens'].get('displayFont'), tokens.get('displayFont')
    if final != designed:
        fonts = [f for f in fonts if f != designed]
        if final in FONTS and final not in fonts:
            fonts.append(final)
    return fonts


def _layouts(spec: dict) -> dict:
    screens = spec.get('pantallas', {})
    layouts = {screen: screens.get(screen, {}).get('layout') for screen in LAYOUT_SCREENS}
    layouts.update({screen: screens.get(screen, {}).get('patron') for screen in PATTERN_SCREENS})
    return {screen: layouts[screen] for screen in SCREENS}


def build(spec: dict, brand_inputs: dict, palette: dict, typography: dict, percent: float) -> dict:
    tokens = final_tokens(spec, brand_inputs, palette, typography)
    return {
        'codigo': spec['codigo'], 'nombre': spec['nombre'], 'familia': spec['familia'],
        'tokens': tokens, 'layouts': _layouts(spec), 'fotos': dict(spec.get('fotos', {})),
        'fuentesGoogle': _google_fonts(spec, tokens),
        'descuento': {'porcentaje': percent, 'activo': percent > 0},
    }


# ---- resolución por sede ------------------------------------------------------------------------------------------
def get_settings(restaurant: str, venue: str) -> VenueMenuSettings | None:
    return VenueMenuSettings.objects.select_related('template').filter(restaurant_slug=restaurant, venue_slug=venue).first()


def _spec_for(restaurant: str, venue: str) -> tuple[dict, dict, dict]:
    chosen = get_settings(restaurant, venue)
    if chosen is not None:
        return chosen.template.spec, chosen.palette or {}, chosen.typography or {}
    template = default_template()
    return (template.spec if template else FALLBACK_SPEC), {}, {}


def resolve_template(tenant: Tenant) -> dict:
    """El dict `plantilla` del contexto de entrada, desde caché."""
    key = _key(tenant.restaurant_slug, tenant.venue_slug)
    cached = cache.get(key)
    if cached is not None:
        return cached
    spec, palette, typography = _spec_for(tenant.restaurant_slug, tenant.venue_slug)
    resolved = build(spec, brand.brand_inputs(tenant), palette, typography, discount.percent_for(tenant))
    cache.set(key, resolved, settings.TEMPLATE_CACHE_SECONDS)
    return resolved


def settings_view(restaurant: str, venue: str) -> dict:
    """Los ajustes crudos (lo que el POS edita), no la plantilla resuelta."""
    chosen = get_settings(restaurant, venue)
    if chosen is None:
        return {'plantilla': default_code(), 'paleta': {}, 'tipografia': {}, 'actualizado': None, 'porDefecto': True}
    return {'plantilla': chosen.template_id, 'paleta': chosen.palette, 'tipografia': chosen.typography,
            'actualizado': chosen.updated_at.isoformat(), 'porDefecto': False}


# ---- validación y guardado (PUT interno) --------------------------------------------------------------------------
def validate(body: dict) -> tuple[MenuTemplate, dict, dict]:
    if not isinstance(body, dict):
        raise InvalidSettings('El cuerpo debe ser un objeto con plantilla, paleta y tipografia.')
    code = body.get('plantilla')
    template = MenuTemplate.objects.filter(code=code).first() if isinstance(code, str) else None
    if template is None:
        raise InvalidSettings(f'La plantilla {code!r} no está en el catálogo.')
    spec = template.spec
    customizable = spec.get('personalizable', {})
    palette = body.get('paleta') or {}
    typography = body.get('tipografia') or {}
    if not isinstance(palette, dict) or not isinstance(typography, dict):
        raise InvalidSettings('paleta y tipografia deben ser objetos.')
    allowed = customizable.get('colores', [])
    for key, value in palette.items():
        if key not in allowed:
            raise InvalidSettings(f'El color «{key}» no se puede personalizar en la plantilla {template.code}.')
        if not isinstance(value, str) or not COLOR_RE.match(value):
            raise InvalidSettings(f'El color «{key}» debe ser #RRGGBB.')
    palette = {k: v.upper() for k, v in palette.items()}
    display = typography.get('display')
    if set(typography) - {'display'}:
        raise InvalidSettings('tipografia solo admite «display».')
    if display:
        if not customizable.get('tipografiaDisplay', True):
            raise InvalidSettings(f'La plantilla {template.code} no permite cambiar la tipografía de títulos.')
        if display not in FONTS and display != spec['tokens'].get('displayFont'):
            raise InvalidSettings(f'La tipografía «{display}» no está en la lista: {", ".join(FONTS)} o la de la plantilla.')
        typography = {'display': display}
    else:
        typography = {}
    tokens = {**spec['tokens'], **palette}
    accent = tokens['acento']
    ratio = contrast(accent, ink_for(accent))
    if ratio < MIN_CONTRAST:
        raise InvalidSettings(f'El color de acción {accent} no contrasta lo suficiente con su texto ({ratio:.2f}:1; mínimo {MIN_CONTRAST}:1).')
    if palette.keys() & {'tinta', 'fondo'}:
        ratio = contrast(tokens['tinta'], tokens['fondo'])
        if ratio < MIN_CONTRAST:
            raise InvalidSettings(f'La tinta {tokens["tinta"]} no se lee sobre el fondo {tokens["fondo"]} ({ratio:.2f}:1; mínimo {MIN_CONTRAST}:1).')
    return template, palette, typography


def save(restaurant: str, venue: str, body: dict) -> VenueMenuSettings:
    template, palette, typography = validate(body)
    chosen, _ = VenueMenuSettings.objects.update_or_create(
        restaurant_slug=restaurant, venue_slug=venue,
        defaults={'template': template, 'palette': palette, 'typography': typography})
    invalidate(restaurant, venue)
    return chosen
