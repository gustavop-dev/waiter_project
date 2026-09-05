"""Cifrado en reposo de credenciales de inquilinos (Fernet, clave en REGISTRY_FERNET_KEY)."""

from cryptography.fernet import Fernet
from django.conf import settings


def _fernet() -> Fernet:
    return Fernet(settings.REGISTRY_FERNET_KEY.encode())


def encrypt(plain: str) -> str:
    return _fernet().encrypt(plain.encode()).decode()


def decrypt(cipher: str) -> str:
    return _fernet().decrypt(cipher.encode()).decode()
