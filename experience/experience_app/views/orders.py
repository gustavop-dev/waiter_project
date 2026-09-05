from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.response import Response

from experience_app.models import Order, TableSession
from experience_app.services import orders
from experience_app.views.sessions import diner_for


@api_view(['POST'])
def confirm(request, session_id):
    session = get_object_or_404(TableSession, id=session_id, state__in=TableSession.OPEN_STATES)
    diner_for(request, session)
    order, created = orders.confirm(session)
    return Response({'pedido': str(order.id), 'estado': 'enviado', 'total': float(order.total or 0)}, status=201 if created else 200)


@api_view(['GET'])
def detail(request, order_id):
    return Response(orders.status_view(get_object_or_404(Order, id=order_id)))
