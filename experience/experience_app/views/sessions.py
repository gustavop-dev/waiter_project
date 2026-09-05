"""Sesión de comensal (cookie HttpOnly) y carrito compartido con atribución."""
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.response import Response

from experience_app.adapters.registry.client import RegistryUnavailable, TenantNotFound, resolve
from experience_app.models import CartLine, Diner, TableSession
from experience_app.services import catalog, discount, sessions

COOKIE = 'waiter_diner'
COOKIE_MAX_AGE = 12 * 3600


def diner_for(request, session: TableSession) -> Diner:
    return get_object_or_404(Diner.objects.select_related('account'), key=request.COOKIES.get(COOKIE, ''), session=session)


def discount_percent(session: TableSession) -> float:
    """El porcentaje de la sede (pos.config, con la carta en caché). Si la sede no resuelve, el del diseño: el carrito
    siempre se muestra."""
    try:
        return discount.percent_for(resolve(session.restaurant_slug, session.venue_slug, session.table_token))
    except (RegistryUnavailable, TenantNotFound):
        return discount.DEFAULT_PERCENT


def cart_of(session: TableSession, diner: Diner) -> dict:
    return sessions.cart_view(session, diner, discount_percent(session))


@api_view(['POST'])
def open_session(request):
    data = request.data
    tenant = resolve(data.get('restaurante', ''), data.get('sede', ''), data.get('token') or None)
    session, diner = sessions.open_session(tenant, request.COOKIES.get(COOKIE))
    if tenant.table_token and not session.orders.exists():
        sessions.table_call(tenant, session, 'ordering')
    response = Response({'sesion': {'id': str(session.id), 'estado': session.state, 'mesa': session.table_number}, 'comensal': {'id': str(diner.id)}}, status=201)
    response.set_cookie(COOKIE, diner.key, max_age=COOKIE_MAX_AGE, httponly=True, samesite='Lax', path='/api/v1/')
    return response


@api_view(['GET'])
def cart(request, session_id):
    session = get_object_or_404(TableSession, id=session_id)
    return Response(cart_of(session, diner_for(request, session)))


@api_view(['POST'])
def add_line(request, session_id):
    session = get_object_or_404(TableSession, id=session_id, state__in=TableSession.OPEN_STATES)
    diner = diner_for(request, session)
    tenant = resolve(session.restaurant_slug, session.venue_slug, session.table_token)
    product = catalog.find_product(tenant, int(request.data.get('producto_id', 0)))
    line = sessions.add_line(session, diner, product, max(1, int(request.data.get('cantidad', 1))), str(request.data.get('nota', ''))[:200])
    return Response({'linea': line.id, **cart_of(session, diner)}, status=201)


@api_view(['PATCH', 'DELETE'])
def line(request, session_id, line_id):
    session = get_object_or_404(TableSession, id=session_id)
    diner = diner_for(request, session)
    cart_line = get_object_or_404(CartLine, id=line_id, session=session, status=CartLine.OPEN)
    if request.method == 'DELETE':
        sessions.remove_line(cart_line, diner)
    else:
        qty = request.data.get('cantidad')
        sessions.update_line(cart_line, diner, qty=None if qty is None else max(1, int(qty)), note=request.data.get('nota'))
    return Response(cart_of(session, diner))


@api_view(['POST'])
def call_waiter(request, session_id):
    session = get_object_or_404(TableSession, id=session_id, state__in=TableSession.OPEN_STATES)
    diner_for(request, session)
    tenant = resolve(session.restaurant_slug, session.venue_slug, session.table_token)
    return Response({'ok': sessions.table_call(tenant, session, 'assist')})


@api_view(['GET', 'POST'])
def request_bill(request, session_id):
    session = get_object_or_404(TableSession, id=session_id, state__in=TableSession.OPEN_STATES)
    diner = diner_for(request, session)
    tenant = resolve(session.restaurant_slug, session.venue_slug, session.table_token)
    ok = sessions.table_call(tenant, session, 'bill') if request.method == 'POST' else False
    return Response({'ok': ok, **sessions.bill_summary(session, diner, discount.percent_for(tenant), include_open=request.method == 'GET')})
