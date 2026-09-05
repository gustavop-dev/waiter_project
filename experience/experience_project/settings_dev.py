"""Desarrollo: DEBUG, cualquier host (la VM escucha en 192.168.56.10), sqlite local."""
from .settings import *  # noqa: F401,F403

DEBUG = True
ALLOWED_HOSTS = ['*']
