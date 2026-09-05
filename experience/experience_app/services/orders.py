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
from experience_app.models import CartLine, Diner, Order, TableSession
from experience_app.services import discount
from experience_app.services.sessions import PAID_STATES, close_paid, open_lines
from experience_app.utils.errors import NothingToConfirm, SessionAlreadyPaid

STATUS_BY_KITCHEN = {'none': 'enviado', 'cooking': 'en_cocina', 'ready': 'listo', 'served': 'servido'}


def _line_uuid(order: Order, line: CartLine) -> str:
    # Estable entre reintentos: Odoo casa las líneas por uuid y no las duplica.
    return str(uuid.uuid5(order.id, str(line.id)))


def _to_odoo_lines(order: Order, lines: list[CartLine]) -> list[pos.OrderLine]:
    return [pos.OrderLine(uuid=_line_uuid(order, line), product_id=line.product_id, name=line.name, unit_price=float(line.unit_price),
                          qty=line.qty, note=line.note, tax_ids=list(line.tax_ids), discount=float(line.discount)) for line in lines]


def _first_purchase_discount(tenant, diner: Diner | None, new_lines: list[CartLine]) -> tuple[Decimal, list[CartLine]]:
    """(porcentaje, líneas nuevas del comensal que lo llevan). Vacío si no tiene cuenta verificada o ya lo usó."""
    if diner is None or not discount.applicable(diner):
        return Decimal(0), []
    percent = Decimal(str(discount.percent_for(tenant)))
    if percent <= 0:
        return Decimal(0), []
    mine = [line for line in new_lines if line.diner_id == diner.id]
    for line in mine:
        line.discount = percent  # en memoria: viaja a Odoo ahora y se guarda solo si Odoo aceptó el pedido
    return percent, mine


def confirm(session: TableSession, diner: Diner | None = None) -> tuple[Order, bool]:
    """Devuelve (pedido, hubo_algo_nuevo). Sin líneas nuevas, devuelve el pedido tal cual sin tocar Odoo.

    `diner` es quien confirma: si tiene cuenta verificada con el descuento de primera compra sin usar, SUS líneas nuevas
    van a Odoo con `discount` y la cuenta queda marcada; las de los demás comensales de la mesa no.
    """
    new_lines = list(open_lines(session))
    order = session.orders.order_by('created_at').first()
    if not new_lines:
        if order is None or order.state != Order.SENT:
            raise NothingToConfirm()
        return order, False
    tenant = resolve(session.restaurant_slug, session.venue_slug, session.table_token)
    client = OdooClient(tenant.odoo)
    # Si el salón ya cobró el pedido de esta visita, la visita terminó: no se le agregan líneas a un pedido pagado.
    if order is not None and order.state == Order.SENT and order.odoo_order_id and pos.read_order_status(client, order.odoo_order_id).state in PAID_STATES:
        close_paid(session)
        raise SessionAlreadyPaid()
    order = order or Order.objects.create(session=session)
    percent, discounted = _first_purchase_discount(tenant, diner, new_lines)
    all_lines = list(session.lines.filter(status=CartLine.CONFIRMED).order_by('created_at')) + new_lines
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
        if discounted:
            session.lines.filter(id__in=[line.id for line in discounted]).update(discount=percent)
            # Una sola vez por cuenta: Odoo ya aceptó las líneas con descuento, así que aquí se marca como usado.
            diner.account.discount_used_at = timezone.now()
            diner.account.save(update_fields=['discount_used_at'])
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
    if status.state in PAID_STATES:
        close_paid(session)  # la siguiente sesión de la mesa empieza limpia
        return {**base, 'estado': 'pagado'}
    return {**base, 'estado': STATUS_BY_KITCHEN[status.kitchen]}
