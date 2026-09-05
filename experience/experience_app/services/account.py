"""Cuenta del comensal (Plan H): registro en tres campos, verificación por código y el historial de sus pedidos.

Maquetada con datos reales: la cuenta, la verificación y el descuento se guardan y se aplican de verdad; lo que falta es
el proveedor del código. `verify` acepta en demo cualquier código de seis dígitos: AQUÍ va el proveedor real (correo o
SMS): `register` le pide el envío y `verify` le pregunta si el código es válido y vigente, sin cambiar los endpoints.
"""
import re

from django.utils import timezone

from experience_app.models import CartLine, Diner, DinerAccount, Order, TableSession

CODE_RE = re.compile(r'^\d{6}$')
EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
PHONE_RE = re.compile(r'^\+?[\d\s\-]{7,20}$')


class InvalidRegistration(Exception):
    """Un campo del registro no sirve; el mensaje va tal cual al comensal."""


class InvalidCode(Exception):
    pass


def _clean(data: dict) -> dict:
    name = str(data.get('nombre') or '').strip()
    email = str(data.get('correo') or '').strip().lower()
    phone = re.sub(r'\s+', ' ', str(data.get('celular') or '').strip())
    if not name or len(name) > 60:
        raise InvalidRegistration('Dinos tu nombre (hasta 60 caracteres).')
    if not EMAIL_RE.match(email) or len(email) > 120:
        raise InvalidRegistration('Ese correo no parece válido.')
    if phone and not PHONE_RE.match(phone):
        raise InvalidRegistration('Ese celular no parece válido.')
    if data.get('aceptaDatos') is not True:
        raise InvalidRegistration('Para crear la cuenta hay que aceptar la política de datos.')
    return {'name': name, 'email': email, 'phone': phone, 'accepts_data': True, 'marketing': bool(data.get('novedades'))}


def register(data: dict) -> DinerAccount:
    """Crea la cuenta pendiente. Un correo ya verificado devuelve SU cuenta (así «Ya tengo cuenta» es el mismo camino):
    en demo cualquiera podría verificarla; con el proveedor real solo quien reciba el código en ese correo."""
    fields = _clean(data)
    existing = DinerAccount.objects.filter(email=fields['email'], verified=True).order_by('created_at').first()
    if existing is not None:
        return existing
    return DinerAccount.objects.create(**fields)


def verify(account: DinerAccount, diner: Diner, code) -> DinerAccount:
    """Demo: cualquier código de seis dígitos verifica. Liga la cuenta a la cookie del comensal."""
    if not CODE_RE.match(str(code or '').strip()):
        raise InvalidCode()
    if not account.verified:
        account.verified, account.verified_at = True, timezone.now()
        account.save(update_fields=['verified', 'verified_at'])
    if diner.account_id != account.id:
        diner.account = account
        diner.save(update_fields=['account'])
    return account


def logout(diner: Diner) -> None:
    if diner.account_id is not None:
        diner.account = None
        diner.save(update_fields=['account'])


def profile_view(account: DinerAccount) -> dict:
    return {'id': str(account.id), 'nombre': account.name, 'correo': account.email, 'celular': account.phone,
            'novedades': account.marketing, 'verificada': account.verified,
            'descuentoDisponible': account.discount_available,
            'descuentoUsado': account.discount_used_at.isoformat() if account.discount_used_at else None,
            'creada': account.created_at.isoformat()}


def history(account: DinerAccount) -> list[dict]:
    """Pedidos enviados de las sesiones donde participó un comensal con esta cuenta, del más reciente al más viejo.

    El estado sale de la sesión (pagada por el salón o no), sin ir a Odoo por cada pedido viejo.
    """
    orders = (Order.objects.filter(state=Order.SENT, session__diners__account=account)
              .distinct().select_related('session').order_by('-created_at'))
    diner_ids = set(account.diners.values_list('id', flat=True))
    lines = CartLine.objects.filter(order__in=orders, diner_id__in=diner_ids).order_by('created_at')
    mine_by_order: dict = {}
    lines_by_order: dict = {}
    for line in lines:
        mine, saved = mine_by_order.get(line.order_id, (0, 0))
        mine_by_order[line.order_id] = (mine + line.net_subtotal, saved + line.discount_amount)
        lines_by_order.setdefault(line.order_id, []).append(
            {'producto_id': line.product_id, 'nombre': line.name, 'cantidad': line.qty, 'precio': float(line.shown_unit_price)})
    out = []
    for order in orders:
        mine, saved = mine_by_order.get(order.id, (0, 0))
        mine_lines = lines_by_order.get(order.id, [])
        # `local` es el nombre legible del restaurante; la sesión solo guarda slugs (el nombre real llega con el contexto).
        out.append({'id': str(order.id), 'fecha': order.created_at.isoformat(), 'total': float(order.total or 0),
                    'mio': float(mine), 'descuento': float(saved), 'mesa': order.session.table_number,
                    'estado': 'pagado' if order.session.state == TableSession.PAID else 'enviado',
                    'restaurante': order.session.restaurant_slug, 'sede': order.session.venue_slug,
                    'local': order.session.restaurant_slug.replace('-', ' ').title(),
                    'items': sum(line['cantidad'] for line in mine_lines), 'lineas': mine_lines})
    return out
