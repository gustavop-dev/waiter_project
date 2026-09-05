"""La carta por sede, desde caché. Odoo no está en el camino caliente del comensal."""
from django.conf import settings
from django.core.cache import cache

from experience_app.adapters.odoo import pos
from experience_app.adapters.odoo.client import OdooClient
from experience_app.adapters.registry.client import Tenant
from experience_app.utils.errors import ProductNotFound


def _key(tenant: Tenant) -> str:
    return f'catalog:{tenant.restaurant_slug}/{tenant.venue_slug}'


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


def menu_view(catalog: pos.Catalog) -> dict:
    """Carta normalizada para el comensal: categorías con sus productos, en el orden del POS."""
    categories = sorted(catalog.categories, key=lambda c: (c.sequence, c.id))
    items = [{'id': p.id, 'nombre': p.name, 'precio': p.price, 'agotado': p.sold_out, 'categorias': p.category_ids} for p in catalog.products]
    return {
        'restaurante': catalog.company_name,
        'categorias': [{'id': c.id, 'nombre': c.name, 'productos': [i for i in items if c.id in i['categorias']]} for c in categories],
    }
