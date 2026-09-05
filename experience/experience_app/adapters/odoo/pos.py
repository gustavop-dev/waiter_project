"""Operaciones del POS sobre el cliente: carta, sesión de caja, pedido, cocina, pago.

Las formas de datos son las REALES de Odoo 19 (many2one como enteros pelados en
load_data, precio y categorías en product.template), ya verificadas en pos/.
"""
import base64
import re
from dataclasses import dataclass, field

from experience_app.adapters.odoo.client import OdooClient

OPEN_SESSION_STATES = ['opening_control', 'opened']
# Tamaños públicos de la foto → campo de image.mixin. 512 px basta para la tarjeta de la carta;
# la pantalla del plato la muestra a ancho completo y en un móvil 3x necesita 1024 px.
PHOTO_FIELDS = {'tarjeta': 'image_512', 'plato': 'image_1024'}
DEFAULT_PHOTO_SIZE = 'tarjeta'
# Solo formatos raster: un SVG servido inline desde nuestro origen podría ejecutar script (XSS). Lo demás sale como binario opaco.
IMAGE_SIGNATURES = [(b'\x89PNG', 'image/png'), (b'\xff\xd8', 'image/jpeg'), (b'GIF8', 'image/gif')]


@dataclass(frozen=True)
class Product:
    id: int
    name: str
    price: float
    category_ids: list[int]
    tax_ids: list[int]
    sold_out: bool = False
    template_id: int = 0
    description: str = ''
    favorite: bool = False
    has_image: bool = False
    # write_date de la plantilla, compactado: cambia con la foto y versiona su URL pública.
    image_version: str = ''


@dataclass(frozen=True)
class Category:
    id: int
    name: str
    sequence: int


@dataclass(frozen=True)
class Catalog:
    company_name: str
    products: list[Product] = field(default_factory=list)
    categories: list[Category] = field(default_factory=list)


@dataclass(frozen=True)
class OrderLine:
    uuid: str
    product_id: int
    name: str
    unit_price: float
    qty: float
    note: str
    tax_ids: list[int]


@dataclass(frozen=True)
class OdooOrder:
    id: int
    reference: str
    state: str
    total: float
    tax: float
    paid: float


@dataclass(frozen=True)
class OrderStatus:
    state: str  # draft | paid | done | invoiced | cancel
    kitchen: str  # none | cooking | ready | served


def load_catalog(client: OdooClient, pos_session_id: int) -> Catalog:
    # Todos los modelos: una lista parcial rompe con KeyError dentro de Odoo.
    raw = client.call_kw('pos.session', 'load_data', [[pos_session_id], []])
    templates = {t['id']: t for t in raw['product.template'] if t['available_in_pos'] and t['active']}
    template_of = {p['id']: templates.get(p['product_tmpl_id']) for p in raw['product.product']}
    base = {pid: t for pid, t in template_of.items() if t}
    # "Agotado" solo aplica a almacenables: un consumible sin control de stock tiene qty 0 siempre.
    storable = [pid for pid, t in base.items() if t['is_storable']]
    sold_out: set[int] = set()
    if storable:
        rows = client.call_kw('product.product', 'search_read', [[['id', 'in', storable]], ['qty_available']])
        sold_out = {r['id'] for r in rows if r['qty_available'] <= 0}
    # description_sale e image_128 llegan como False cuando están vacíos (no como '' ni None).
    products = [Product(id=pid, name=t['name'], price=t['list_price'], category_ids=t['pos_categ_ids'], tax_ids=t['taxes_id'],
                        sold_out=pid in sold_out, template_id=t['id'], description=t.get('description_sale') or '',
                        favorite=bool(t.get('is_favorite')), has_image=bool(t.get('image_128')),
                        image_version=_version(t.get('write_date'))) for pid, t in base.items()]
    categories = [Category(c['id'], c['name'], c['sequence']) for c in raw['pos.category']]
    company = raw['res.company'][0]['name'] if raw.get('res.company') else ''
    return Catalog(company_name=company, products=products, categories=categories)


def _version(write_date) -> str:
    """'2026-09-05 01:02:03' → '20260905010203': un cache-buster corto y seguro en una URL."""
    return re.sub(r'\D', '', str(write_date or ''))


def image_content_type(data: bytes) -> str:
    """Tipo real de la imagen por sus primeros bytes: Odoo conserva el formato original (PNG, WebP, GIF, JPEG)."""
    if data[:4] == b'RIFF' and data[8:12] == b'WEBP':
        return 'image/webp'
    return next((ctype for magic, ctype in IMAGE_SIGNATURES if data.startswith(magic)), 'application/octet-stream')


def fetch_product_image(client: OdooClient, template_id: int, size: str = DEFAULT_PHOTO_SIZE) -> tuple[bytes, str] | None:
    """Bytes y content-type de la foto de la plantilla, leídos por JSON-RPC. None si la plantilla no tiene foto.

    No se usa /web/image: es público y responde 200 image/png con el placeholder genérico de Odoo tanto sin sesión
    como sin foto o con una plantilla inexistente, así que no distingue nada. Por JSON-RPC el campo llega en False
    cuando está vacío, la lista vacía si la plantilla ya no existe (o fue archivada), y se reutiliza la
    reautenticación de call_kw.
    """
    image_field = PHOTO_FIELDS[size]
    rows = client.call_kw('product.template', 'search_read', [[['id', '=', template_id]], [image_field]])
    encoded = rows[0].get(image_field) if rows else None
    if not encoded:
        return None
    data = base64.b64decode(encoded)
    return data, image_content_type(data)


def ensure_open_session(client: OdooClient, config_id: int) -> int:
    rows = client.call_kw('pos.session', 'search_read',
                          [[['state', 'in', OPEN_SESSION_STATES], ['config_id', '=', config_id]], ['id']], {'limit': 1})
    if rows:
        return rows[0]['id']
    session_id = client.call_kw('pos.session', 'create', [{'config_id': config_id}])
    client.call_kw('pos.session', 'action_pos_session_open', [[session_id]])
    return session_id


def _read_order(client: OdooClient, order_id: int) -> OdooOrder:
    raw = client.call_kw('pos.order', 'read', [[order_id], ['pos_reference', 'state', 'amount_total', 'amount_tax', 'amount_paid']])[0]
    return OdooOrder(id=raw['id'], reference=raw['pos_reference'], state=raw['state'], total=raw['amount_total'], tax=raw['amount_tax'], paid=raw['amount_paid'])


def sync_payload(*, pos_session_id: int, table_id: int | None, order_uuid: str, guests: int, lines: list[OrderLine], date_order: str) -> dict:
    payload = {
        'id': -1, 'uuid': order_uuid, 'session_id': pos_session_id, 'customer_count': guests, 'sequence_number': 1, 'state': 'draft',
        'amount_total': 0, 'amount_tax': 0, 'amount_paid': 0, 'amount_return': 0, 'date_order': date_order,
        'lines': [[0, 0, {
            'id': -1, 'uuid': line.uuid, 'product_id': line.product_id, 'qty': line.qty, 'price_unit': line.unit_price,
            'tax_ids': [[6, 0, line.tax_ids]], 'price_subtotal': 0, 'price_subtotal_incl': 0,
            'full_product_name': line.name, 'customer_note': line.note,
        }] for line in lines],
    }
    if table_id is not None:
        payload['table_id'] = table_id
    return payload


def create_order(client: OdooClient, *, pos_session_id: int, table_id: int | None, order_uuid: str, guests: int,
                 lines: list[OrderLine], date_order: str) -> OdooOrder:
    """Idempotente por uuid: Odoo actualiza el pedido existente en vez de duplicarlo (_get_open_order)."""
    payload = sync_payload(pos_session_id=pos_session_id, table_id=table_id, order_uuid=order_uuid, guests=guests, lines=lines, date_order=date_order)
    result = client.call_kw('pos.order', 'sync_from_ui', [[payload]])
    order_id = result['pos.order'][0]['id']
    # Por la API cruda amount_total queda en 0: el recálculo en servidor es obligatorio (y es lo que hace que
    # los precios del cliente no importen).
    client.call_kw('pos.order', 'recompute_prices', [[order_id]])
    # Origen del pedido (addon projectapp_ops): de aquí salen "sin intervención humana" y el ROI.
    client.call_kw('pos.order', 'write', [[order_id], {'waiter_origin': 'diner'}])
    return _read_order(client, order_id)


def fire_course(client: OdooClient, order_id: int) -> int | None:
    """Envía a cocina lo que aún no tiene curso (addon projectapp_kitchen). None si no había nada nuevo."""
    lines = client.call_kw('pos.order.line', 'search_read', [[['order_id', '=', order_id], ['course_id', '=', False]], ['id']])
    if not lines:
        return None
    course_id = client.call_kw('restaurant.order.course', 'kitchen_fire', [order_id, [line['id'] for line in lines]])
    return course_id or None


def read_order_status(client: OdooClient, order_id: int) -> OrderStatus:
    order = _read_order(client, order_id)
    courses = client.call_kw('restaurant.order.course', 'search_read',
                             [[['order_id', '=', order_id], ['fired', '=', True]], ['ready_date', 'served_date']])
    if not courses:
        kitchen = 'none'
    elif any(not c['ready_date'] for c in courses):
        kitchen = 'cooking'
    elif any(not c['served_date'] for c in courses):
        kitchen = 'ready'
    else:
        kitchen = 'served'
    return OrderStatus(state=order.state, kitchen=kitchen)


def pay_order(client: OdooClient, order_id: int, payment_method_id: int, amount: float) -> OdooOrder:
    client.call_kw('pos.order', 'add_payment', [[order_id], {'pos_order_id': order_id, 'payment_method_id': payment_method_id, 'amount': amount}])
    client.call_kw('pos.order', 'action_pos_order_paid', [[order_id]])
    return _read_order(client, order_id)


def cash_payment_method_id(client: OdooClient) -> int:
    rows = client.call_kw('pos.payment.method', 'search_read', [[], ['id', 'type']])
    return next(r['id'] for r in rows if r['type'] == 'cash')


# Lo que el comensal pide llega al salón por Odoo (addon projectapp_ops): "ordering" | "assist" | "bill" | "none".
def set_table_call(client: OdooClient, table_id: int, kind: str) -> None:
    client.call_kw('restaurant.table', 'set_waiter_call', [[table_id], kind])
