"""Descuento de primera compra de la app del comensal (Plan H), en `pos.config` y sin vistas.

El restaurante decide el porcentaje (o lo apaga con 0) desde Configuración del POS; la experiencia del
comensal (`experience/`) lo lee con la carta por `pos.session.load_data` y lo aplica de verdad al confirmar:
las líneas del comensal con cuenta verificada viajan con `pos.order.line.discount`, una sola vez por cuenta.
Vive en Odoo para que todas las tablets y el comensal vean el mismo valor.
"""
from odoo import fields, models


class PosConfig(models.Model):
    _inherit = "pos.config"

    signup_discount_percent = fields.Float(
        string="Descuento de primera compra (%)", default=5.0, digits=(5, 2),
        help="Porcentaje que la app del comensal descuenta, una sola vez, a quien crea y verifica su cuenta. "
             "Se aplica sobre las líneas de ese comensal al confirmar el pedido (nunca sobre propina ni servicio). "
             "0 lo apaga.")

    def _load_pos_data_fields(self, *args, **kwargs):
        # Odoo devuelve [] para pos.config: "todos los campos", este incluido. Si algún día devuelve una lista
        # concreta, se agrega el propio; nunca se reemplaza [] por una lista (igual que en ops.py).
        fields_ = super()._load_pos_data_fields(*args, **kwargs)
        if not fields_:
            return fields_
        return fields_ + ["signup_discount_percent"]
