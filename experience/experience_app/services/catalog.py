"""La carta y las fotos por sede, desde caché. Odoo no está en el camino caliente del comensal."""
from collections.abc import Callable

from django.conf import settings
from django.core.cache import cache

from experience_app.adapters.odoo import pos
from experience_app.adapters.odoo.client import OdooClient
from experience_app.adapters.registry.client import Tenant
from experience_app.utils.errors import ProductNotFound

PHOTO_SIZES = frozenset(pos.PHOTO_FIELDS)
DEFAULT_PHOTO_SIZE = pos.DEFAULT_PHOTO_SIZE
# La clave de la foto lleva la versión de la plantilla: una foto nueva es una clave nueva, así que la caché puede
# vivir mucho más que la carta sin servir nunca una foto vieja (ni volver a Odoo por cada comensal).
PHOTO_CACHE_SECONDS = max(settings.MENU_CACHE_SECONDS, 3600)


def _key(tenant: Tenant) -> str:
    return f'catalog:{tenant.restaurant_slug}/{tenant.venue_slug}'


def _photo_key(tenant: Tenant, product: pos.Product, size: str) -> str:
    return f'photo:{tenant.restaurant_slug}/{tenant.venue_slug}/{product.template_id}/{size}/{product.image_version}'


def get_catalog(tenant: Tenant) -> pos.Catalog:
    cached = cache.get(_key(tenant))
    if cached is not None:
        return cached
    client = OdooClient(tenant.odoo)
    session_id = pos.ensure_open_session(client, tenant.odoo.pos_config_id)
    catalog = pos.load_catalog(client, session_id)
    cache.set(_key(tenant), catalog, settings.MENU_CACHE_SECONDS)
    return catalog


def invalidate(restaurant: str, venue: str) -> None:
    cache.delete(f'catalog:{restaurant}/{venue}')


def find_product(tenant: Tenant, product_id: int) -> pos.Product:
    product = next((p for p in get_catalog(tenant).products if p.id == product_id), None)
    if product is None:
        raise ProductNotFound(product_id)
    return product


def get_photo(tenant: Tenant, product: pos.Product, size: str = DEFAULT_PHOTO_SIZE) -> tuple[bytes, str] | None:
    """(bytes, content-type) de la foto, o None si Odoo ya no la tiene. Una sola lectura a Odoo por foto, tamaño y versión.

    El None también se cachea: una carta que aún dice "tiene foto" no manda a Odoo a cada comensal.
    """
    return cache.get_or_set(_photo_key(tenant, product, size),
                            lambda: pos.fetch_product_image(OdooClient(tenant.odoo), product.template_id, size),
                            PHOTO_CACHE_SECONDS)


def menu_view(catalog: pos.Catalog, photo_url: Callable[[int, str], str]) -> dict:
    """Carta normalizada para el comensal: categorías con sus productos, en el orden del POS.

    `photo_url(product_id, version)` construye la URL pública de la foto: la carta nunca lleva la URL de Odoo, y la
    versión (write_date de la plantilla) cambia la URL cuando cambia la foto para que la caché pública no la retenga.
    """
    categories = sorted(catalog.categories, key=lambda c: (c.sequence, c.id))
    items = [{'id': p.id, 'nombre': p.name, 'precio': p.price, 'agotado': p.sold_out, 'categorias': p.category_ids,
              'descripcion': p.description, 'favorito': p.favorite,
              'foto': photo_url(p.id, p.image_version) if p.has_image else None}
             for p in catalog.products]
    return {
        'restaurante': catalog.company_name,
        'categorias': [{'id': c.id, 'nombre': c.name, 'productos': [i for i in items if c.id in i['categorias']]} for c in categories],
    }
