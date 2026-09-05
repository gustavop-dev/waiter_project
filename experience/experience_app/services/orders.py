"""Confirmación del carrito hacia Odoo y estado del pedido.

Un TableSession tiene UN pedido en Odoo; cada confirmación agrega líneas y dispara
una comanda nueva con lo que aún no fue a cocina. El uuid del Order es el uuid del
pos.order: Odoo actualiza en vez de duplicar, así que reintentar es seguro.
"""
import uuid
from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from experience_app.adapters.odoo import pos
from experience_app.adapters.odoo.client import OdooClient, OdooError
from experience_app.adapters.registry.client import resolve
from experience_app.models import CartLine, Order, TableSession
from experience_app.services.sessions import open_lines
from experience_app.utils.errors import NothingToConfirm

STATUS_BY_KITCHEN = {'none': 'enviado', 'cooking': 'en_cocina', 'ready': 'listo', 'served': 'servido'}
PAID_STATES = {'paid', 'done', 'invoiced'}


def _line_uuid(order: Order, line: CartLine) -> str:
    # Estable entre reintentos: Odoo casa las líneas por uuid y no las duplica.
    return str(uuid.uuid5(order.id, str(line.id)))


def _to_odoo_lines(order: Order, lines: list[CartLine]) -> list[pos.OrderLine]:
    return [pos.OrderLine(uuid=_line_uuid(order, line), product_id=line.product_id, name=line.name, unit_price=float(line.unit_price),
                          qty=line.qty, note=line.note, tax_ids=list(line.tax_ids)) for line in lines]


def confirm(session: TableSession) -> tuple[Order, bool]:
    """Devuelve (pedido, hubo_algo_nuevo). Sin líneas nuevas, devuelve el pedido tal cual sin tocar Odoo."""
    new_lines = list(open_lines(session))
    order = session.orders.order_by('created_at').first()
    if not new_lines:
        if order is None or order.state != Order.SENT:
            raise NothingToConfirm()
        return order, False
    order = order or Order.objects.create(session=session)
    all_lines = list(session.lines.filter(status=CartLine.CONFIRMED).order_by('created_at')) + new_lines
    tenant = resolve(session.restaurant_slug, session.venue_slug, session.table_token)
    client = OdooClient(tenant.odoo)
    try:
        pos_session_id = pos.ensure_open_session(client, tenant.odoo.pos_config_id)
        odoo_order = pos.create_order(client, pos_session_id=pos_session_id, table_id=session.odoo_table_id, order_uuid=str(order.id),
                                      guests=max(1, session.diners.count()), lines=_to_odoo_lines(order, all_lines),
                                      date_order=timezone.now().strftime('%Y-%m-%d %H:%M:%S'))
        pos.fire_course(client, odoo_order.id)
    except OdooError as exc:
        order.state, order.attempts, order.last_error = Order.FAILED, order.attempts + 1, str(exc)
        order.save(update_fields=['state', 'attempts', 'last_error'])
        raise
    if session.odoo_table_id is not None:
        pos.set_table_call(client, session.odoo_table_id, 'none')  # ya no está "pidiendo": el salón ve el pedido en cocina
    with transaction.atomic():
        order.state, order.attempts, order.last_error = Order.SENT, order.attempts + 1, ''
        order.odoo_order_id, order.total, order.tax, order.sent_at = odoo_order.id, Decimal(str(odoo_order.total)), Decimal(str(odoo_order.tax)), timezone.now()
        order.save()
        session.lines.filter(id__in=[line.id for line in new_lines]).update(status=CartLine.CONFIRMED, order=order)
        session.state = TableSession.CONFIRMED
        session.save(update_fields=['state'])
    return order, True


def status_view(order: Order) -> dict:
    base = {'id': str(order.id), 'sesion': str(order.session_id), 'total': float(order.total or 0), 'impuestos': float(order.tax or 0), 'intentos': order.attempts}
    if order.state != Order.SENT:
        return {**base, 'estado': 'fallido', 'detalle': order.last_error}
    session = order.session
    tenant = resolve(session.restaurant_slug, session.venue_slug, session.table_token)
    status = pos.read_order_status(OdooClient(tenant.odoo), order.odoo_order_id)
    estado = 'pagado' if status.state in PAID_STATES else STATUS_BY_KITCHEN[status.kitchen]
    return {**base, 'estado': estado}
