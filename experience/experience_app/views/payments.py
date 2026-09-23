"""Pago maquetado (Plan H): la forma final del endpoint sin pasarela detrás.

POST /api/v1/sesiones/<id>/pago/simulado/ {metodo, reparto?} → {estado: "aprobado", referencia, demo: true}. No toca Odoo
ni cambia la sesión: el POS sigue cobrando en la mesa. Cuando llegue la pasarela (Wompi, Mercado Pago o PayU), este
endpoint se reemplaza por el adaptador real en experience_app/payments/ y la respuesta pierde `demo`.
"""
import logging
import uuid

from django.conf import settings
from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.response import Response

from experience_app.models import CartLine, Order, TableSession
from experience_app.services.sessions import bill_summary
from experience_app.views.sessions import diner_for

log = logging.getLogger(__name__)
METHODS = ('tarjeta', 'pse', 'nequi', 'efectivo')


@api_view(['POST'])
def simulated(request, session_id):
    session = get_object_or_404(TableSession, id=session_id, state__in=TableSession.OPEN_STATES)
    diner = diner_for(request, session)
    if not isinstance(request.data, dict):
        return Response({'detail': 'El cuerpo debe ser un objeto'}, status=400)
    method = str(request.data.get('metodo') or '').strip().lower()
    if method not in METHODS:
        return Response({'detail': f"Método de pago inválido; usa {', '.join(METHODS)}"}, status=400)
    if settings.IS_PRODUCTION or not settings.DINER_DEMO_ENABLED:
        return Response({'detail': 'El pago demo no está disponible'}, status=503)
    order = session.orders.filter(state=Order.SENT).first()
    if order is None or session.lines.filter(status=CartLine.OPEN).exists():
        return Response({'detail': 'Confirma el pedido antes de pagar'}, status=409)
    scope = request.data.get('reparto', 'all')
    if scope not in ('all', 'mine', 'parts'):
        return Response({'detail': 'Reparto inválido'}, status=400)
    summary = bill_summary(session, diner)
    amount = float(order.total or 0) if scope == 'all' else summary['mio'] if scope == 'mine' else summary['porParte']
    if amount <= 0:
        return Response({'detail': 'No hay un monto confirmado para pagar'}, status=409)
    reference = f'DEMO-{uuid.uuid4().hex[:8].upper()}'
    # El registro es la única huella del pago simulado: sirve para la demo y para depurar, nunca para conciliar.
    log.info('pago simulado %s: sesión %s, comensal %s, %s por %.2f (sin cobro real)', reference, session.id, diner.id, method, amount)
    return Response({'estado': 'aprobado', 'referencia': reference, 'demo': True, 'metodo': method, 'monto': amount, 'reparto': scope})
