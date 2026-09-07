"""Cocina sobre los cursos de Odoo.

`restaurant.order.course` ya representa "comanda enviada a cocina" con `fired`
y `fired_date`. Aquí se añade lo que Community no guarda: cuándo quedó lista,
cuándo se entregó y a qué estación va cada categoría. La hora siempre la pone
el servidor: el navegador nunca manda un reloj.

Kit CloudPos (Plan I): un plato viaja solo, no en bloque con su comanda. Cocina lo marca
listo cuando sale al pase (`waiter_ready_date`) y el mesero lo marca entregado cuando lo
deja en la mesa (`served_date`); las dos cosas, plato a plato o toda la comanda de una vez.
Por eso ambas fechas viven en `pos.order.line` además de en el curso: el curso queda listo
cuando no le falta ninguna línea por salir, y servido cuando no le falta ninguna por llegar
a la mesa. Nadie entrega lo que cocina no ha marcado listo: eso se impide aquí, no en la
pantalla, porque hay tres pantallas que lo ofrecen.
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
        """«Listo todo» de cocina: la comanda entera sale al pase, con cada una de sus líneas."""
        now = fields.Datetime.now()
        self.write({"ready_date": now})
        self.line_ids.filtered(lambda line: not line.waiter_ready_date and not line.waiter_cancelled).write({"waiter_ready_date": now})
        return True

    def action_kitchen_served(self):
        """«Entregar todo» del mesero: se entrega lo que cocina ya sacó al pase. Lo que sigue en cocina
        se queda; el curso se cierra solo si con eso no le falta nada."""
        now = fields.Datetime.now()
        pending = self.line_ids.filtered(lambda line: not line.served_date and not line.waiter_cancelled)
        ready = pending.filtered(lambda line: line.waiter_ready_date or line.course_id.ready_date)
        if not ready:
            raise UserError(_("Cocina todavía no ha marcado ningún plato como listo."))
        ready.write({"served_date": now})
        self._kitchen_close_if_all_served(now)
        return True

    def _kitchen_close_if_all_ready(self, now):
        """Un curso queda listo cuando ninguna línea sigue en el fuego (lista o cancelada)."""
        for course in self.filtered(lambda c: not c.ready_date):
            if course.line_ids and all(line.waiter_ready_date or line.waiter_cancelled for line in course.line_ids):
                course.write({"ready_date": now})

    def _kitchen_close_if_all_served(self, now):
        """Un curso queda servido cuando ninguna línea sigue pendiente (servida o cancelada)."""
        for course in self.filtered(lambda c: not c.served_date):
            if course.line_ids and all(line.served_date or line.waiter_cancelled for line in course.line_ids):
                course.write({"served_date": now})


class PosOrderLine(models.Model):
    _inherit = "pos.order.line"

    waiter_ready_date = fields.Datetime(string="Lista en cocina", help="Cuándo salió al pase, para que el mesero la lleve.")
    served_date = fields.Datetime(string="Servida en mesa")
    waiter_cancelled = fields.Boolean(string="Cancelada por el mesero", default=False,
                                      help="Línea retirada antes de ir a cocina (estado «Waiting to cooked» del kit).")

    @api.model
    def _load_pos_data_fields(self, *args, **kwargs):
        return super()._load_pos_data_fields(*args, **kwargs) + ["waiter_ready_date", "served_date", "waiter_cancelled"]

    @api.model
    def action_kitchen_line_ready(self, line_ids):
        """Cocina marca platos listos, uno a uno. Cierra el curso cuando no le falta ninguno.
        Devuelve los ids de los cursos que quedaron listos."""
        lines = self.browse(line_ids).exists()
        now = fields.Datetime.now()
        lines.filtered(lambda line: not line.waiter_ready_date).write({"waiter_ready_date": now})
        courses = lines.course_id
        courses._kitchen_close_if_all_ready(now)
        return courses.filtered("ready_date").ids

    @api.model
    def action_kitchen_line_served(self, line_ids):
        """El mesero marca platos entregados en la mesa. Cierra el curso cuando todas sus líneas lo están.
        Devuelve los ids de los cursos que quedaron servidos."""
        lines = self.browse(line_ids).exists()
        # Nadie entrega lo que cocina no ha sacado: si la pantalla lo ofrece por error, aquí se para.
        not_ready = lines.filtered(lambda line: not line.served_date and not line.waiter_ready_date and not line.course_id.ready_date)
        if not_ready:
            names = ", ".join(line.full_product_name or line.product_id.display_name for line in not_ready)
            raise UserError(_("Cocina todavía no ha marcado como listo: %s.", names))
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
