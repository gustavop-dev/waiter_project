"""Cocina sobre los cursos de Odoo.

`restaurant.order.course` ya representa "comanda enviada a cocina" con `fired`
y `fired_date`. Aquí se añade lo que Community no guarda: cuándo quedó lista,
cuándo se entregó y a qué estación va cada categoría. La hora siempre la pone
el servidor: el navegador nunca manda un reloj.
Decisión: docs/decisiones/2026-09-05-cocina-sobre-cursos-odoo.md
"""
from uuid import uuid4

from odoo import api, fields, models


class RestaurantOrderCourse(models.Model):
    _inherit = "restaurant.order.course"

    ready_date = fields.Datetime(string="Listo en cocina")
    served_date = fields.Datetime(string="Entregado en mesa")

    @api.model
    def kitchen_fire(self, order_id, line_ids):
        """Crea un curso disparado con las líneas dadas. Devuelve su id (o False si no hay líneas)."""
        if not line_ids:
            return False
        index = self.search_count([("order_id", "=", order_id)]) + 1
        course = self.create({
            "order_id": order_id,
            "index": index,
            "uuid": str(uuid4()),
            "fired": True,
            "fired_date": fields.Datetime.now(),
            "line_ids": [(6, 0, line_ids)],
        })
        return course.id

    def action_kitchen_ready(self):
        self.write({"ready_date": fields.Datetime.now()})
        return True

    def action_kitchen_served(self):
        self.write({"served_date": fields.Datetime.now()})
        return True


class PosCategory(models.Model):
    _inherit = "pos.category"

    kitchen_station = fields.Char(string="Estación de cocina", help="Parrilla, Fríos, Postres, Barra… Vacío: solo aparece en «Todas».")

    @api.model
    def _load_pos_data_fields(self, *args, **kwargs):
        return super()._load_pos_data_fields(*args, **kwargs) + ["kitchen_station"]
