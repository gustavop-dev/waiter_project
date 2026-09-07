"""Generador de cocina: cuando un curso queda listo (`ready_date`), una notificación por línea."""
from odoo import _, models


class RestaurantOrderCourse(models.Model):
    _inherit = "restaurant.order.course"

    def write(self, vals):
        newly_ready = self.filtered(lambda c: not c.ready_date) if vals.get("ready_date") else self.browse()
        result = super().write(vals)
        if newly_ready:
            newly_ready._waiter_notify_ready()
        return result

    def _waiter_notify_ready(self):
        values = []
        for course in self:
            order = course.order_id
            where = _("Mesa %s", order.table_id.table_number) if order.table_id else (getattr(order, "waiter_number", False) or order.name)
            for line in course.line_ids.filtered(lambda l: not l.waiter_cancelled):
                values.append({
                    "kind": "kitchen", "title": _("Plato listo para servir"),
                    "body": _("%(product)s · %(where)s", product=line.full_product_name or line.product_id.display_name, where=where),
                    "res_model": "pos.order", "res_id": order.id, "action": "serve",
                })
        return self.env["waiter.notification"].sudo().create(values)
