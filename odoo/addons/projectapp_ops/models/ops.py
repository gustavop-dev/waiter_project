"""Campos de operación para el backoffice propio (sin vistas).

- pos.order.waiter_origin: quién originó el pedido. Lo pone el bloque 3 ('diner')
  o el Mesero IA ('ai'); por defecto es del mesero. De aquí sale "Sin
  intervención humana" y el ROI.
- pos.config: umbrales de alerta y supuestos del ROI, editables desde
  Configuración. Viven en Odoo para que todas las tablets vean lo mismo.
"""
from odoo import fields, models


class PosOrder(models.Model):
    _inherit = "pos.order"

    waiter_origin = fields.Selection(
        [("waiter", "Mesero"), ("diner", "Comensal"), ("ai", "Mesero IA")],
        string="Origen del pedido", default="waiter", index=True)


class PosConfig(models.Model):
    _inherit = "pos.config"

    alert_late_minutes = fields.Integer(string="Minutos para 'demorado'", default=18)
    alert_bill_minutes = fields.Integer(string="Minutos con la cuenta pedida sin cobrar", default=10)
    roi_hour_cost = fields.Float(string="Costo hora de atención (COP)", default=20000.0)
    roi_minutes_per_order = fields.Float(string="Minutos de atención que ahorra un pedido autónomo", default=11.0)
    roi_baseline_hours_per_100 = fields.Float(string="Horas de atención por 100 pedidos antes de ProjectApp", default=18.4)
    roi_monthly_cost = fields.Float(string="Coste mensual de ProjectApp (COP)", default=2740000.0)
    roi_start_date = fields.Date(string="Inicio de uso de ProjectApp")

    def _load_pos_data_fields(self, *args, **kwargs):
        # Odoo devuelve [] para pos.config: "todos los campos", los nuestros incluidos. Si algún día
        # devuelve una lista concreta, se agregan los propios; nunca se reemplaza [] por una lista.
        fields_ = super()._load_pos_data_fields(*args, **kwargs)
        if not fields_:
            return fields_
        return fields_ + ["alert_late_minutes", "alert_bill_minutes", "roi_hour_cost", "roi_minutes_per_order",
                          "roi_baseline_hours_per_100", "roi_monthly_cost", "roi_start_date"]


class RestaurantTable(models.Model):
    """Lo que el comensal pide desde su móvil llega al salón por aquí (lo escribe el bloque 3 por su adaptador)."""

    _inherit = "restaurant.table"

    waiter_call = fields.Selection(
        [("none", "Nada"), ("ordering", "Pidiendo"), ("assist", "Pide mesero"), ("bill", "Pide la cuenta")],
        string="Llamada del comensal", default="none", index=True)
    waiter_call_at = fields.Datetime(string="Desde")

    def set_waiter_call(self, kind):
        """Cambia la llamada y anota la hora del servidor. 'none' la limpia."""
        self.write({"waiter_call": kind, "waiter_call_at": fields.Datetime.now() if kind != "none" else False})
        return True
