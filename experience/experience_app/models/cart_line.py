from django.db import models


class CartLine(models.Model):
    """Línea del carrito compartido de la mesa, atribuida a un comensal.

    "Pagar lo mío" es un filtro por comensal; "dividir" es una división del total;
    "carrito compartido" es la vista sin filtrar. Todo sale de la misma tabla.
    """

    OPEN, CONFIRMED = 'open', 'confirmed'

    session = models.ForeignKey('experience_app.TableSession', on_delete=models.CASCADE, related_name='lines')
    diner = models.ForeignKey('experience_app.Diner', on_delete=models.CASCADE, related_name='lines')
    product_id = models.PositiveIntegerField()
    name = models.CharField(max_length=200)
    unit_price = models.DecimalField(max_digits=12, decimal_places=2)
    qty = models.PositiveIntegerField(default=1)
    note = models.CharField(max_length=200, blank=True)
    tax_ids = models.JSONField(default=list)
    status = models.CharField(max_length=10, default=OPEN)
    order = models.ForeignKey('experience_app.Order', on_delete=models.SET_NULL, null=True, blank=True, related_name='lines')
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def subtotal(self):
        return self.unit_price * self.qty
