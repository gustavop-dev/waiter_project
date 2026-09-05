"""Pago maquetado (Plan H): la forma final del endpoint sin pasarela detrás.

POST /api/v1/sesiones/<id>/pago/simulado/ {metodo, monto} → {estado: "aprobado", referencia, demo: true}. No toca Odoo
ni cambia la sesión: el POS sigue cobrando en la mesa. Cuando llegue la pasarela (Wompi, Mercado Pago o PayU), este
endpoint se reemplaza por el adaptador real en experience_app/payments/ y la respuesta pierde `demo`.
"""
import logging
import uuid

from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.response import Response

from experience_app.models import TableSession
from experience_app.views.sessions import diner_for

log = logging.getLogger(__name__)
METHODS = ('tarjeta', 'pse', 'nequi', 'efectivo')


@api_view(['POST'])
def simulated(request, session_id):
    session = get_object_or_404(TableSession, id=session_id, state__in=TableSession.OPEN_STATES)
    diner = diner_for(request, session)
    method = str(request.data.get('metodo') or '').strip().lower()
    if method not in METHODS:
        return Response({'detail': f"Método de pago inválido; usa {', '.join(METHODS)}"}, status=400)
    try:
        amount = round(float(request.data.get('monto')), 2)
    except (TypeError, ValueError):
        amount = -1
    if amount < 0:
        return Response({'detail': 'El monto debe ser un número mayor o igual a cero'}, status=400)
    reference = f'DEMO-{uuid.uuid4().hex[:8].upper()}'
    # El registro es la única huella del pago simulado: sirve para la demo y para depurar, nunca para conciliar.
    log.info('pago simulado %s: sesión %s, comensal %s, %s por %.2f (sin cobro real)', reference, session.id, diner.id, method, amount)
    return Response({'estado': 'aprobado', 'referencia': reference, 'demo': True, 'metodo': method, 'monto': amount})
