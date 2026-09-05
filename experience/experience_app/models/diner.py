import secrets
import uuid

from django.db import models


def new_key() -> str:
    return secrets.token_urlsafe(32)


class Diner(models.Model):
    """Comensal sin registro: lo identifica una cookie. Cada línea del carrito sabe de quién es."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    session = models.ForeignKey('experience_app.TableSession', on_delete=models.CASCADE, related_name='diners')
    key = models.CharField(max_length=64, unique=True, default=new_key)
    name = models.CharField(max_length=60, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
