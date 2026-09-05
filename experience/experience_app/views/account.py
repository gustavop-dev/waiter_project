"""Cuenta del comensal (Plan H, Contrato 3). La identidad es la cookie del comensal (misma que el carrito).

POST /api/v1/cuenta/registro/   {nombre, correo, celular, aceptaDatos, novedades} → {id, codigoDemo: true}
POST /api/v1/cuenta/verificar/  {id, codigo}  → demo: cualquier código de seis dígitos; liga la cuenta a la cookie
GET  /api/v1/cuenta/            perfil + historial (pedidos de las sesiones donde participó esta cuenta)
POST /api/v1/cuenta/salir/      desliga la cuenta de esta cookie
"""
import uuid

from django.shortcuts import get_object_or_404
from rest_framework.decorators import api_view
from rest_framework.response import Response

from experience_app.models import Diner, DinerAccount
from experience_app.services import account as accounts
from experience_app.views.sessions import COOKIE

NO_ACCOUNT = {'detail': 'No hay una cuenta en este dispositivo'}


def _diner(request) -> Diner:
    # 404 y no 401: sin cookie no hay comensal, y la cuenta cuelga del comensal (no hay otro login).
    return get_object_or_404(Diner.objects.select_related('account'), key=request.COOKIES.get(COOKIE, ''))


@api_view(['POST'])
def register(request):
    _diner(request)
    try:
        account = accounts.register(request.data if isinstance(request.data, dict) else {})
    except accounts.InvalidRegistration as exc:
        return Response({'detail': str(exc)}, status=400)
    # codigoDemo: no se envió ningún código; el comensal puede escribir cualquiera de seis dígitos (ver services/account.py).
    return Response({'id': str(account.id), 'codigoDemo': True}, status=201)


@api_view(['POST'])
def verify(request):
    diner = _diner(request)
    raw_id = str(request.data.get('id') or '')
    try:
        account_id = uuid.UUID(raw_id)
    except ValueError:
        return Response({'detail': 'La cuenta indicada no existe'}, status=404)
    account = get_object_or_404(DinerAccount, id=account_id)
    try:
        accounts.verify(account, diner, request.data.get('codigo'))
    except accounts.InvalidCode:
        return Response({'detail': 'El código debe tener seis dígitos'}, status=400)
    return Response({'cuenta': accounts.profile_view(account)})


@api_view(['GET'])
def profile(request):
    diner = _diner(request)
    if diner.account is None or not diner.account.verified:
        return Response(NO_ACCOUNT, status=404)
    # `pedidos` es la clave que consume el comensal (Contrato 3 / diner AccountSummary).
    return Response({'cuenta': accounts.profile_view(diner.account), 'pedidos': accounts.history(diner.account)})


@api_view(['POST'])
def logout(request):
    accounts.logout(_diner(request))
    return Response({'ok': True})
