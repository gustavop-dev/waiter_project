from odoo import fields, models


class PurchaseOrder(models.Model):
    _inherit = "purchase.order"

    waiter_pantry_request = fields.Boolean(string="Solicitud de la despensa", default=False, index=True,
                                           help="Creada desde el POS con waiter_request_ingredient; aparece en la Request List.")

    def waiter_request_vals(self, created=False):
        """Fila de la "Request List" del kit."""
        self.ensure_one()
        states = dict(self._fields["state"]._description_selection(self.env))
        return {
            "id": self.id, "name": self.name, "state": self.state, "state_label": states.get(self.state, self.state),
            "created": created, "partner_id": self.partner_id.id, "partner_name": self.partner_id.display_name,
            "date_order": fields.Datetime.to_string(self.date_order), "amount_total": self.amount_total,
            "currency_id": self.currency_id.id,
            "lines": [{
                "id": line.id, "product_id": line.product_id.id, "product_tmpl_id": line.product_id.product_tmpl_id.id,
                "name": line.product_id.display_name, "qty": line.product_qty, "uom_id": line.product_uom_id.id,
                "uom_name": line.product_uom_id.name, "price_unit": line.price_unit,
            } for line in self.order_line if line.product_id],
        }
