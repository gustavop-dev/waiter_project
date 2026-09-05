"""Errores de dominio y su traducción a respuestas (manejador de DRF)."""
from rest_framework.response import Response
from rest_framework.views import exception_handler

from experience_app.adapters.odoo.client import OdooUnavailable
from experience_app.adapters.registry.client import RegistryUnavailable, TenantNotFound


class NotOwner(Exception):
    """Un comensal intenta tocar la línea de otro."""


class ProductNotFound(Exception):
    pass


class NothingToConfirm(Exception):
    pass


MAPPING = [
    (TenantNotFound, 404, 'Esta mesa no está disponible'),
    (ProductNotFound, 400, 'Ese producto no está en la carta'),
    (NotOwner, 403, 'Solo quien agregó el plato puede cambiarlo'),
    (NothingToConfirm, 400, 'No hay nada que confirmar'),
    (OdooUnavailable, 503, 'El restaurante no responde; tu pedido se conserva, intenta de nuevo'),
    (RegistryUnavailable, 503, 'Servicio no disponible, intenta de nuevo'),
]


def handle(exc, context):
    for kind, status, message in MAPPING:
        if isinstance(exc, kind):
            return Response({'detail': message}, status=status)
    return exception_handler(exc, context)
