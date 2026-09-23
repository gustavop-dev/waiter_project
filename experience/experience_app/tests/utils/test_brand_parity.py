"""La derivación del tema en experience/ es copia deliberada de la del registro: este test es el candado."""
import importlib.util
import sys
from pathlib import Path

import pytest

from experience_app.utils import brand as ours

REPO = Path(__file__).resolve().parents[4]
REGISTRY = REPO / 'registry'
# Claros, oscuros, medios, el default, el de la marca de ejemplo y uno en minúsculas (el registro los normaliza).
COLORS = ['#F2C94C', '#FFFFFF', '#1A1815', '#000000', '#7A2E2A', '#808080', ours.DEFAULT_COLOR, '#3b6ea5']
INPUTS = [(color, font, radius) for color in COLORS for font, radius in [('Fraunces', 24), ('Nope', 99), ('', None)]]


def _registry_brand():
    """Importa registry_app.utils.brand por ruta (sys.path al repo). None si el registro no está junto a este checkout."""
    if not (REGISTRY / 'registry_app' / 'utils' / 'brand.py').exists():
        return None
    if str(REGISTRY) not in sys.path:
        sys.path.insert(0, str(REGISTRY))
    if importlib.util.find_spec('registry_app.utils.brand') is None:
        return None
    return importlib.import_module('registry_app.utils.brand')


theirs = _registry_brand()
needs_registry = pytest.mark.skipif(theirs is None, reason='registry/ no está disponible junto a experience/')


@needs_registry
@pytest.mark.parametrize('color,font,radius', INPUTS)
def test_theme_matches_the_registry_for_every_kind_of_color(color, font, radius):
    """Atrapa una regla cambiada en un solo servicio: el comensal vería una tinta o un suave distintos según quién derive."""
    assert ours.theme(color, font, radius) == theirs.theme(color, font, radius)


@needs_registry
def test_constants_and_primitives_match_the_registry():
    """Atrapa una fuente, un radio o el color por defecto que exista en un servicio y no en el otro."""
    assert (ours.FONTS, ours.RADII, ours.DEFAULT_COLOR) == (theirs.FONTS, theirs.RADII, theirs.DEFAULT_COLOR)
    for color in COLORS:
        assert (ours.ink_for(color), ours.soft_for(color)) == (theirs.ink_for(color), theirs.soft_for(color))
        assert ours.contrast(color, '#FFFFFF') == theirs.contrast(color, '#FFFFFF')


def test_theme_is_idempotent_over_its_own_output():
    """Atrapa que re-derivar desde lo que manda el registro (ya validado) cambie el tema: brand_view depende de esto."""
    for color, font, radius in INPUTS:
        once = ours.theme(color, font, radius)
        assert ours.theme(once['color'], once['fuente'], once['radio']) == once
