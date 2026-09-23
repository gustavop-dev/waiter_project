import json

from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from rest_framework.exceptions import APIException


class PaymentUnavailable(APIException):
    status_code = 503
    default_detail = 'No pudimos contactar el servicio de pagos. Conservamos tu operación; consulta su estado antes de volver a pagar.'


def cipher():
    try:
        return Fernet(settings.PAYMENTS_FERNET_KEY.encode())
    except (ValueError, TypeError):
        raise PaymentUnavailable('Falta configurar el cifrado de credenciales de pago en el servidor.') from None


def encrypt(value):
    return cipher().encrypt(json.dumps(value).encode()).decode()


def decrypt(value):
    try:
        return json.loads(cipher().decrypt(value.encode())) if value else {}
    except (InvalidToken, ValueError):
        raise PaymentUnavailable('No se pudieron abrir las credenciales de pago.') from None
