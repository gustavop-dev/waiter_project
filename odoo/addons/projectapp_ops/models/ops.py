"""Campos de operación para el backoffice propio (sin vistas).

- pos.order.waiter_origin: quién originó el pedido. Lo pone el bloque 3 ('diner')
  o el Mesero IA ('ai'); por defecto es del mesero. De aquí sale "Sin
  intervención humana" y el ROI.
- pos.order (kit CloudPos, Plan I): silla de bebé, bandera "esperando pago" compartida
  entre tablets, prefijo DI/TA/DE según el preset y número visible `DI104` (secuencia por
  día y sede), dirección y teléfono de entrega.
- pos.config: umbrales de alerta y supuestos del ROI, editables desde
  Configuración. Viven en Odoo para que todas las tablets vean lo mismo.
- restaurant.floor.floor_type y restaurant.table.rotation: lo que el editor de salón del kit
  dibuja y Community no guarda.
"""
from datetime import datetime, time, timedelta

import pytz

from odoo import _, api, fields, models
from odoo.exceptions import UserError, ValidationError

# Prefijo visible del kit según dónde se sirve el preset (`pos.preset.service_at`, de pos_self_order).
PREFIX_BY_SERVICE = {"table": "DI", "counter": "TA", "delivery": "DE"}
WAITER_ORDER_FIELDS = ["baby_chair", "waiter_billing", "waiter_prefix", "waiter_number", "delivery_address", "delivery_phone",
                       "waiter_origin"]


class PosOrder(models.Model):
    _inherit = "pos.order"

    waiter_origin = fields.Selection(
        [("waiter", "Mesero"), ("diner", "Comensal"), ("ai", "Mesero IA")],
        string="Origen del pedido", default="waiter", index=True)
    baby_chair = fields.Boolean(string="Silla de bebé", default=False)
    waiter_billing = fields.Boolean(
        string="Esperando pago", default=False, index=True,
        help="El mesero pidió la cuenta y el pedido espera el cobro. Se comparte entre tablets.")
    waiter_prefix = fields.Char(
        string="Prefijo del pedido", compute="_compute_waiter_prefix", store=True, size=2,
        help="DI (en mesa), TA (para llevar) o DE (domicilio), según `preset_id.service_at`.")
    waiter_number = fields.Char(
        string="Número del pedido", copy=False, index=True, readonly=True,
        help="Prefijo más secuencia del día por sede (pos.config): DI001, DI002, TA001… Se asigna al crear.")
    delivery_address = fields.Char(string="Dirección de entrega")
    delivery_phone = fields.Char(string="Teléfono de entrega", size=32)

    @api.depends("preset_id.service_at")
    def _compute_waiter_prefix(self):
        for order in self:
            order.waiter_prefix = PREFIX_BY_SERVICE.get(order.preset_id.service_at or "table", "DI")

    @api.model
    def _load_pos_data_fields(self, *args, **kwargs):
        # Odoo devuelve [] para pos.order ("todos los campos"). Si algún día devuelve una lista concreta,
        # se agregan los propios; nunca se reemplaza [] por una lista.
        fields_ = super()._load_pos_data_fields(*args, **kwargs)
        if not fields_:
            return fields_
        return fields_ + WAITER_ORDER_FIELDS

    # --- Número visible del kit --------------------------------------------------------------------

    def _waiter_day_bounds(self):
        """Inicio y fin (UTC, naive) del día de hoy en la zona horaria del usuario del terminal."""
        tz = pytz.timezone(self.env.user.tz or "UTC")
        today = datetime.now(tz).date()
        start = tz.localize(datetime.combine(today, time.min)).astimezone(pytz.utc).replace(tzinfo=None)
        return start, start + timedelta(days=1)

    def _waiter_next_number(self):
        """`<prefijo><NNN>`: cuenta los pedidos del mismo prefijo, sede y día. La fila del pos.config se
        bloquea (FOR UPDATE) para que dos tablets no obtengan el mismo número."""
        self.ensure_one()
        self.env.cr.execute("SELECT id FROM pos_config WHERE id = %s FOR UPDATE", (self.config_id.id,))
        start, end = self._waiter_day_bounds()
        count = self.search_count([
            ("config_id", "=", self.config_id.id), ("waiter_prefix", "=", self.waiter_prefix),
            ("waiter_number", "!=", False), ("id", "!=", self.id),
            ("date_order", ">=", start), ("date_order", "<", end),
        ])
        return f"{self.waiter_prefix}{count + 1:03d}"

    @api.model_create_multi
    def create(self, vals_list):
        orders = super().create(vals_list)
        for order in orders.filtered(lambda o: not o.waiter_number):
            order.waiter_number = order._waiter_next_number()
        return orders

    # --- Acciones que el POS llama por RPC -------------------------------------------------------

    @api.model
    def set_waiter_billing(self, order_id, value):
        """Marca o quita "esperando pago" (`pos.order.set_waiter_billing(order_id, True|False)`)."""
        order = self.browse(int(order_id))
        order.write({"waiter_billing": bool(value)})
        return True

    @api.model
    def waiter_move_table(self, order_id, table_id):
        """Mueve un pedido abierto a otra mesa. Falla (UserError) si la mesa destino ya tiene un pedido abierto."""
        order = self.browse(int(order_id))
        table = self.env["restaurant.table"].browse(int(table_id))
        if not table.exists():
            raise UserError(_("La mesa destino no existe."))
        occupied = self.search_count([("table_id", "=", table.id), ("state", "=", "draft"), ("id", "!=", order.id)])
        if occupied:
            raise UserError(_("La mesa %s ya tiene un pedido abierto.", table.table_number))
        order.write({"table_id": table.id})
        return True

    def _compute_line_subtotals(self, line):
        # pos_self_order recalcula el total con descuento, pero sus subtotales omiten discount.
        product = line.product_id.with_context(line.product_id._get_product_price_context(line.attribute_value_ids))
        taxes = line.tax_ids_after_fiscal_position.compute_all(
            line.price_unit * (1 - (line.discount or 0.0) / 100.0), self.currency_id,
            line.qty, product=product, partner=self.partner_id)
        line.update({'price_subtotal': taxes['total_excluded'], 'price_subtotal_incl': taxes['total_included']})


class PosConfig(models.Model):
    _inherit = "pos.config"

    waiter_can_charge = fields.Boolean(
        string="Los meseros pueden cobrar", default=True,
        help="Con esto apagado, cobrar es solo de caja: el mesero deja la mesa servida y el cajero la elige "
             "en el plano y cobra. No hace falta que el mesero mande nada.")
    waiter_can_edit_inventory = fields.Boolean(
        string="Los meseros pueden editar el inventario", default=False,
        help="Ver el inventario lo hace cualquiera; crear platos o ingredientes, borrarlos o editarlos es "
             "otra cosa. Apagado por defecto: se enciende para el restaurante que quiera dárselo a la sala.")
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
        return fields_ + ["waiter_can_charge", "waiter_can_edit_inventory", "alert_late_minutes", "alert_bill_minutes", "roi_hour_cost", "roi_minutes_per_order",
                          "roi_baseline_hours_per_100", "roi_monthly_cost", "roi_start_date"]


class RestaurantFloor(models.Model):
    _inherit = "restaurant.floor"

    floor_type = fields.Selection([("indoor", "Interior"), ("outdoor", "Exterior")], string="Tipo de zona",
                                  default="indoor", required=True)

    @api.model
    def _load_pos_data_fields(self, *args, **kwargs):
        return super()._load_pos_data_fields(*args, **kwargs) + ["floor_type"]


class RestaurantTable(models.Model):
    """Lo que el comensal pide desde su móvil llega al salón por aquí (lo escribe el bloque 3 por su adaptador)."""

    _inherit = "restaurant.table"

    waiter_call = fields.Selection(
        [("none", "Nada"), ("ordering", "Pidiendo"), ("assist", "Pide mesero"), ("bill", "Pide la cuenta")],
        string="Llamada del comensal", default="none", index=True)
    waiter_call_at = fields.Datetime(string="Desde")
    rotation = fields.Integer(string="Rotación (grados)", default=0, help="0, 90, 180 o 270: giro de la mesa en el plano del kit.")

    @api.constrains("rotation")
    def _check_rotation(self):
        for table in self:
            if table.rotation not in (0, 90, 180, 270):
                raise ValidationError(_("La rotación de la mesa debe ser 0, 90, 180 o 270 grados."))

    @api.model
    def _load_pos_data_fields(self, *args, **kwargs):
        return super()._load_pos_data_fields(*args, **kwargs) + ["rotation", "waiter_call", "waiter_call_at"]

    def set_waiter_call(self, kind):
        """Cambia la llamada y anota la hora del servidor. 'none' la limpia."""
        self.write({"waiter_call": kind, "waiter_call_at": fields.Datetime.now() if kind != "none" else False})
        return True
