"""Smart Menu is the single public design; legacy codes remain stored for rollback."""
import json
from pathlib import Path

DEFAULT_CODE = 'S1'
FAMILIES = {
    'A': 'Alta cocina',
    'B': 'Casual de barrio',
    'C': 'Rápida y food truck',
    'D': 'Café y panadería',
    'E': 'Bar y cervecería',
    'F': 'Sushi y especializados',
}
SCREENS = ('menu', 'carrito', 'pago', 'registro', 'codigo', 'historial')
# Pantallas que se resuelven por `layout` (menú por código; carrito y pago por familia) y por `patron` (cuenta).
LAYOUT_SCREENS = ('menu', 'carrito', 'pago')
PATTERN_SCREENS = ('registro', 'codigo', 'historial')

FALLBACK_SPEC = json.loads((Path(__file__).parent / 'catalogo/S1.json').read_text())
