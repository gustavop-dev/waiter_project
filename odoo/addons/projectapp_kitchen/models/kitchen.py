"""Cocina sobre los cursos de Odoo.

`restaurant.order.course` ya representa "comanda enviada a cocina" con `fired`
y `fired_date`. Aquí se añade lo que Community no guarda: cuándo quedó lista,
cuándo se entregó y a qué estación va cada categoría. La hora siempre la pone
el servidor: el navegador nunca manda un reloj.

Kit CloudPos (Plan I): el detalle del pedido marca cada línea como servida (checkbox) y
cancela líneas que todavía no fueron a cocina. Por eso `served_date` y `waiter_cancelled`
viven también en `pos.order.line`: cuando todas las líneas de un curso están servidas (o
canceladas) el curso queda servido, y marcar el curso servido marca cada línea.
Decisión: docs/decisiones/2026-09-05-cocina-sobre-cursos-odoo.md
"""
from uuid import uuid4

from odoo import _, api, fields, models
from odoo.exceptions import UserError


class RestaurantOrderCourse(models.Model):
    _inherit = "restaurant.order.course"

    ready_date = fields.Datetime(string="Listo en cocina")
    served_date = fields.Datetime(string="Entregado en mesa")

    @api.model
    def _load_pos_data_fields(self, *args, **kwargs):
        return super()._load_pos_data_fields(*args, **kwargs) + ["fired_date", "ready_date", "served_date"]

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
        """Marca el curso servido y, con él, cada línea que no lo estuviera."""
        now = fields.Datetime.now()
        self.write({"served_date": now})
        self.line_ids.filtered(lambda line: not line.served_date and not line.waiter_cancelled).write({"served_date": now})
        return True

    def _kitchen_close_if_all_served(self, now):
        """Un curso queda servido cuando ninguna línea sigue pendiente (servida o cancelada)."""
        for course in self.filtered(lambda c: not c.served_date):
            if course.line_ids and all(line.served_date or line.waiter_cancelled for line in course.line_ids):
                course.write({"served_date": now})


class PosOrderLine(models.Model):
    _inherit = "pos.order.line"

    served_date = fields.Datetime(string="Servida en mesa")
    waiter_cancelled = fields.Boolean(string="Cancelada por el mesero", default=False,
                                      help="Línea retirada antes de ir a cocina (estado «Waiting to cooked» del kit).")

    @api.model
    def _load_pos_data_fields(self, *args, **kwargs):
        return super()._load_pos_data_fields(*args, **kwargs) + ["served_date", "waiter_cancelled"]

    @api.model
    def action_kitchen_line_served(self, line_ids):
        """Marca líneas como servidas (hora del servidor). Cierra el curso cuando todas sus líneas lo están.
        Devuelve los ids de los cursos que quedaron servidos."""
        lines = self.browse(line_ids).exists()
        now = fields.Datetime.now()
        lines.filtered(lambda line: not line.served_date).write({"served_date": now})
        courses = lines.course_id
        courses._kitchen_close_if_all_served(now)
        return courses.filtered("served_date").ids

    @api.model
    def waiter_cancel_lines(self, line_ids):
        """Cancela líneas que todavía no fueron a cocina. Falla (UserError) si alguna está en un curso disparado."""
        lines = self.browse(line_ids).exists()
        fired = lines.filtered(lambda line: line.course_id.fired)
        if fired:
            names = ", ".join(line.full_product_name or line.product_id.display_name for line in fired)
            raise UserError(_("No se puede cancelar: %s ya fue enviado a cocina.", names))
        lines.write({"waiter_cancelled": True})
        lines.course_id._kitchen_close_if_all_served(fields.Datetime.now())
        return True


class PosCategory(models.Model):
    _inherit = "pos.category"

    kitchen_station = fields.Char(string="Estación de cocina", help="Parrilla, Fríos, Postres, Barra… Vacío: solo aparece en «Todas».")

    @api.model
    def _load_pos_data_fields(self, *args, **kwargs):
        return super()._load_pos_data_fields(*args, **kwargs) + ["kitchen_station"]
