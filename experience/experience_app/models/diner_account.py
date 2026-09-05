import uuid

from django.db import models


class DinerAccount(models.Model):
    """Cuenta del comensal (Plan H, maquetada pero con datos reales): nombre, correo y celular a cambio del descuento.

    Se liga a cada `Diner` (cookie) que la verificó; el historial son los pedidos de las sesiones donde participó alguno
    de esos comensales. `discount_used_at` es lo que hace que el descuento de primera compra sea de una sola vez.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=60)
    email = models.EmailField(max_length=120)
    phone = models.CharField(max_length=20, blank=True)
    accepts_data = models.BooleanField(default=False)  # política de datos: obligatoria para crear la cuenta
    marketing = models.BooleanField(default=False)  # novedades del restaurante: sin marcar por ley
    verified = models.BooleanField(default=False)
    verified_at = models.DateTimeField(null=True, blank=True)
    discount_used_at = models.DateTimeField(null=True, blank=True)
    registration_key = models.CharField(max_length=64, blank=True)
    discount_order = models.ForeignKey('experience_app.Order', on_delete=models.PROTECT, null=True, blank=True,
                                       related_name='discount_accounts')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [models.Index(fields=['email'])]

    @property
    def discount_available(self) -> bool:
        return self.verified and self.discount_used_at is None and self.discount_order_id is None


class SignupDiscountClaim(models.Model):
    key = models.CharField(max_length=64, unique=True)
    order = models.ForeignKey('experience_app.Order', on_delete=models.PROTECT)
