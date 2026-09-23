"""Siembra del catálogo: `catalogo/<codigo>.json` → `MenuTemplate`, por upsert.

Corre de dos maneras y las dos son idempotentes:
- `manage.py seed_templates` (a mano, tras sincronizar el catálogo desde el diseño).
- Al terminar `migrate`, por la señal `post_migrate` de esta app (apps.py). Se eligió la señal y no una migración de
  datos porque una migración congela el catálogo en el momento en que se escribió: añadir o corregir un JSON exigiría
  una migración nueva cada vez. Con la señal, `migrate` deja la base igual al repo, siempre.

Nunca borra: una plantilla que desaparece del catálogo sigue en la base (una sede podría tenerla elegida; el FK es
PROTECT). Retirarla es una decisión explícita, no un efecto de sembrar.
"""
import json
from pathlib import Path

from django.db import transaction

CATALOG_DIR = Path(__file__).resolve().parent / 'catalogo'
THUMBNAIL_DIR = Path(__file__).resolve().parent / 'miniaturas'


def catalog_files(directory: Path = CATALOG_DIR) -> list[dict]:
    """Los specs del catálogo en el orden del código (A1, A2, …, F5)."""
    return [json.loads(path.read_text(encoding='utf-8')) for path in sorted(directory.glob('*.json'))]


def thumbnail_path(code: str) -> Path | None:
    # El código viene de la URL: solo se busca por nombre exacto dentro de la carpeta (sin rutas relativas).
    path = THUMBNAIL_DIR / f'{code}.png'
    return path if path.is_file() else None


def seed(using: str = 'default', directory: Path = CATALOG_DIR) -> dict:
    """Upsert de cada JSON. Devuelve {'creadas': n, 'actualizadas': n, 'codigos': [...]}."""
    from experience_app.plantillas.models import MenuTemplate

    created = updated = 0
    codes: list[str] = []
    with transaction.atomic(using=using):
        for position, spec in enumerate(catalog_files(directory)):
            code = spec['codigo']
            fields = {'family': spec['familia'], 'name': spec['nombre'], 'description': spec.get('descripcion', ''),
                      'spec': spec, 'sort': position}
            _, was_created = MenuTemplate.objects.using(using).update_or_create(code=code, defaults=fields)
            created += was_created
            updated += not was_created
            codes.append(code)
    return {'creadas': created, 'actualizadas': updated, 'codigos': codes}
