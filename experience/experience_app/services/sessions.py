"""Sesión de mesa, comensales y carrito con atribución por persona."""
from decimal import Decimal

from experience_app.adapters.odoo.pos import Product
from experience_app.adapters.registry.client import Tenant
from experience_app.models import CartLine, Diner, TableSession
from experience_app.utils.errors import NotOwner


def _open_table_session(tenant: Tenant) -> TableSession | None:
    return TableSession.objects.filter(restaurant_slug=tenant.restaurant_slug, venue_slug=tenant.venue_slug,
                                       table_token=tenant.table_token, state__in=TableSession.OPEN_STATES).first()


def open_session(tenant: Tenant, diner_key: str | None) -> tuple[TableSession, Diner]:
    """Mesa: todos los que tocan el NFC caen en la misma sesión abierta. Domicilio: la sesión es de quien la abre."""
    diner = Diner.objects.select_related('session').filter(key=diner_key).first() if diner_key else None
    if tenant.table_token:
        session = _open_table_session(tenant) or TableSession.objects.create(
            restaurant_slug=tenant.restaurant_slug, venue_slug=tenant.venue_slug, table_token=tenant.table_token,
            table_number=tenant.table_number, odoo_table_id=tenant.odoo_table_id)
    elif diner and diner.session.is_delivery and diner.session.state in TableSession.OPEN_STATES \
            and (diner.session.restaurant_slug, diner.session.venue_slug) == (tenant.restaurant_slug, tenant.venue_slug):
        session = diner.session
    else:
        session = TableSession.objects.create(restaurant_slug=tenant.restaurant_slug, venue_slug=tenant.venue_slug)
    if diner is None or diner.session_id != session.id:
        diner = Diner.objects.create(session=session)
    return session, diner


def add_line(session: TableSession, diner: Diner, product: Product, qty: int, note: str = '') -> CartLine:
    return CartLine.objects.create(session=session, diner=diner, product_id=product.id, name=product.name,
                                   unit_price=Decimal(str(product.price)), qty=qty, note=note, tax_ids=product.tax_ids)


def update_line(line: CartLine, diner: Diner, qty: int | None = None, note: str | None = None) -> CartLine:
    if line.diner_id != diner.id:
        raise NotOwner()
    if qty is not None:
        line.qty = qty
    if note is not None:
        line.note = note
    line.save(update_fields=['qty', 'note'])
    return line


def remove_line(line: CartLine, diner: Diner) -> None:
    if line.diner_id != diner.id:
        raise NotOwner()
    line.delete()


def open_lines(session: TableSession):
    return session.lines.filter(status=CartLine.OPEN).select_related('diner').order_by('created_at')


def cart_view(session: TableSession, diner: Diner) -> dict:
    lines = list(open_lines(session))
    per_diner: dict[str, Decimal] = {}
    for line in lines:
        per_diner[str(line.diner_id)] = per_diner.get(str(line.diner_id), Decimal(0)) + line.subtotal
    total = sum(per_diner.values(), Decimal(0))
    return {
        'sesion': str(session.id),
        'lineas': [{
            'id': line.id, 'comensal': str(line.diner_id), 'mio': line.diner_id == diner.id, 'producto_id': line.product_id,
            'nombre': line.name, 'precio': float(line.unit_price), 'cantidad': line.qty, 'nota': line.note, 'subtotal': float(line.subtotal),
        } for line in lines],
        'total': float(total),
        'mio': float(per_diner.get(str(diner.id), Decimal(0))),
        'por_comensal': [{'comensal': k, 'total': float(v)} for k, v in per_diner.items()],
    }
