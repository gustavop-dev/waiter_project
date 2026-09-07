"""Reservas de mesa del kit CloudPos: franja de 30 minutos, mesa, personas, silla de bebé, pre-pedido y correo.

Sin vistas: el POS (`pos/lib/services/reservations.ts`) llama estos métodos por `call_kw`.
"""
import math
from datetime import datetime, timedelta

import pytz

from odoo import Command, api, fields, models, _
from odoo.exceptions import UserError, ValidationError

ACTIVE_STATES = ("confirmed", "seated")
DEFAULT_DURATION_HOURS = 1.5
SLOT_HOURS = 0.5


def hour_label(value):
    """10.5 → '10:30'."""
    total = int(round((value or 0.0) * 60))
    return "%02d:%02d" % divmod(total, 60)


class WaiterReservation(models.Model):
    _name = "waiter.reservation"
    _description = "Reserva de mesa"
    _order = "date desc, time_start, id"

    name = fields.Char(string="Código", required=True, readonly=True, copy=False, default="/")
    customer_name = fields.Char(string="Cliente", required=True)
    customer_email = fields.Char(string="Correo")
    customer_phone = fields.Char(string="Teléfono")
    date = fields.Date(string="Fecha", required=True, default=fields.Date.context_today, index=True)
    time_start = fields.Float(string="Hora de inicio", required=True, help="Horas; franjas de 30 minutos (17.5 = 17:30).")
    time_end = fields.Float(string="Hora de fin", required=True, help="Por defecto, inicio + 1,5 h.")
    people = fields.Integer(string="Personas", required=True, default=2)
    baby_chair = fields.Boolean(string="Silla de bebé", default=False)
    table_id = fields.Many2one("restaurant.table", string="Mesa", required=True, ondelete="restrict", index=True)
    floor_id = fields.Many2one(related="table_id.floor_id", string="Piso", store=True)
    state = fields.Selection([
        ("confirmed", "Confirmada"),
        ("seated", "Sentada"),
        ("no_show", "No se presentó"),
        ("cancelled", "Cancelada"),
    ], string="Estado", default="confirmed", required=True, index=True)
    notes = fields.Text(string="Notas")
    preorder_id = fields.Many2one("pos.order", string="Pre-pedido", ondelete="set null", copy=False)
    currency_id = fields.Many2one(related="preorder_id.currency_id")
    amount_total = fields.Monetary(related="preorder_id.amount_total", string="Total del pre-pedido", currency_field="currency_id")

    # ------------------------------------------------------------------ reglas
    @api.constrains("time_start", "time_end", "people")
    def _check_slot(self):
        for reservation in self:
            if reservation.people < 1:
                raise ValidationError(_("La reserva %s necesita al menos una persona.", reservation.name))
            if not (0 <= reservation.time_start < reservation.time_end <= 24):
                raise ValidationError(_("La hora de fin debe ser posterior a la de inicio y ambas estar dentro del día."))
            if abs(reservation.time_start * 2 - round(reservation.time_start * 2)) > 1e-6:
                raise ValidationError(_("La hora de inicio debe caer en una franja de 30 minutos (por ejemplo 17:00 o 17:30)."))

    @api.constrains("table_id", "date", "time_start", "time_end", "state")
    def _check_overlap(self):
        for reservation in self.filtered(lambda r: r.state in ACTIVE_STATES):
            clash = self.search(reservation._overlap_domain(), limit=1)
            if clash:
                raise ValidationError(_(
                    "La mesa %(table)s ya tiene la reserva %(name)s de %(start)s a %(end)s el %(date)s.",
                    table=reservation.table_id.display_name, name=clash.name, start=hour_label(clash.time_start),
                    end=hour_label(clash.time_end), date=fields.Date.to_string(clash.date),
                ))

    def _overlap_domain(self):
        self.ensure_one()
        return [
            ("id", "!=", self.id), ("table_id", "=", self.table_id.id), ("date", "=", self.date),
            ("state", "in", ACTIVE_STATES), ("time_start", "<", self.time_end), ("time_end", ">", self.time_start),
        ]

    # ------------------------------------------------------------------ ciclo de vida
    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get("name", "/") == "/":
                vals["name"] = self.env["ir.sequence"].next_by_code("waiter.reservation") or "/"
            if not vals.get("time_end") and vals.get("time_start") is not None:
                vals["time_end"] = vals["time_start"] + DEFAULT_DURATION_HOURS
        reservations = super().create(vals_list)
        if not self.env.context.get("waiter_skip_confirmation_mail"):
            reservations._send_confirmation()
        return reservations

    def _send_confirmation(self):
        """Encola un mail.mail por cada reserva con correo del cliente. Devuelve los correos creados."""
        template = self.env.ref("projectapp_reservations.mail_template_reservation_confirmed", raise_if_not_found=False)
        mails = self.env["mail.mail"]
        if not template:
            return mails
        for reservation in self.filtered("customer_email"):
            mails |= mails.browse(template.send_mail(reservation.id, email_values={"email_to": reservation.customer_email}))
        return mails

    def action_seated(self):
        """El cliente llegó: la reserva pasa a sentada y el pre-pedido queda visible en la sesión abierta."""
        for reservation in self:
            if reservation.state != "confirmed":
                raise UserError(_("Solo una reserva confirmada puede pasar a sentada (%s está %s).", reservation.name, reservation.state))
            reservation.state = "seated"
            order = reservation.preorder_id
            if order and order.state == "draft":
                vals = {"preset_time": False, "table_id": reservation.table_id.id}
                config = order.config_id or reservation._waiter_config()
                if order.session_id.state == "closed" and config.current_session_id:
                    vals["session_id"] = config.current_session_id.id
                order.write(vals)
        return True

    def action_no_show(self):
        return self._waiter_close("no_show")

    def action_cancel(self):
        return self._waiter_close("cancelled")

    def _waiter_close(self, state):
        for reservation in self:
            if reservation.state not in ACTIVE_STATES:
                raise UserError(_("La reserva %s ya está %s.", reservation.name, reservation.state))
            reservation.state = state
            if reservation.preorder_id and reservation.preorder_id.state == "draft":
                reservation.preorder_id.write({"state": "cancel"})
        return True

    # ------------------------------------------------------------------ API para el POS
    @api.model
    def waiter_slots(self, config_id, date=None):
        """Franjas de 30 minutos entre `reservation_open` y `reservation_close` del pos.config (10:00–22:00 por defecto).

        Cada franja: ``{"time": 10.5, "label": "10:30", "past": bool}``; ``past`` solo se enciende para hoy.
        """
        config = self.env["pos.config"].browse(config_id)
        open_hour, close_hour = config.reservation_open or 10.0, config.reservation_close or 22.0
        date = fields.Date.to_date(date) if date else fields.Date.context_today(self)
        now_hour = self._waiter_now_hour() if date == fields.Date.context_today(self) else -1.0
        slots, hour = [], open_hour
        while hour < close_hour - 1e-6:
            slots.append({"time": hour, "label": hour_label(hour), "past": hour < now_hour})
            hour += SLOT_HOURS
        return slots

    @api.model
    def waiter_available_tables(self, config_id, date, time_start, people, time_end=None, include_unavailable=False):
        """Mesas del punto de venta sin reserva activa que solape y con ``seats >= people``.

        Con ``include_unavailable=True`` devuelve todas con ``status`` = available | reserved | unavailable
        (leyenda del kit "Available / Reserved / Can't Select") y ``reserved_at`` de la reserva que choca.
        """
        config = self.env["pos.config"].browse(config_id)
        date = fields.Date.to_date(date)
        time_end = time_end or time_start + DEFAULT_DURATION_HOURS
        tables = config.floor_ids.filtered("active").table_ids.filtered("active")
        clashes = self.search([
            ("table_id", "in", tables.ids), ("date", "=", date), ("state", "in", ACTIVE_STATES),
            ("time_start", "<", time_end), ("time_end", ">", time_start),
        ], order="time_start, id")
        clash_by_table = {}
        for reservation in clashes:
            clash_by_table.setdefault(reservation.table_id.id, reservation)
        result = []
        for table in self._waiter_sorted_tables(tables):
            clash = clash_by_table.get(table.id)
            status = "reserved" if clash else ("unavailable" if table.seats < people else "available")
            if status != "available" and not include_unavailable:
                continue
            vals = self._waiter_table_vals(table)
            vals.update({
                "status": status, "available": status == "available",
                "reserved_at": hour_label(clash.time_start) if clash else False,
                "reservation": clash._waiter_card_vals() if clash else False,
            })
            result.append(vals)
        return result

    @api.model
    def waiter_create(self, vals, lines=None):
        """Crea la reserva y, si hay ``lines``, un pos.order en borrador (preset Dine In) en la sesión abierta.

        ``vals``: campos de waiter.reservation más ``config_id`` opcional (si falta, el del piso de la mesa).
        ``lines``: ``[{"product_id": <product.product> | "product_tmpl_id": <product.template>, "qty": 1, "note": ""}]``.
        Devuelve el detalle (ver ``waiter_detail``). El correo de confirmación sale después del pre-pedido.
        """
        vals = dict(vals or {})
        config_id = vals.pop("config_id", None)
        reservation = self.with_context(waiter_skip_confirmation_mail=True).create(vals)
        if lines:
            reservation._create_preorder(lines, config_id=config_id)
        reservation._send_confirmation()
        return reservation.waiter_detail()[0]

    @api.model
    def waiter_timeline(self, config_id, date, floor_id=None):
        """Mesas × reservas activas del día para la grilla del kit (mesa por fila, franja por columna)."""
        config = self.env["pos.config"].browse(config_id)
        date = fields.Date.to_date(date)
        floors = config.floor_ids.filtered("active")
        if floor_id:
            floors = floors.filtered(lambda f: f.id == floor_id)
        tables = floors.table_ids.filtered("active")
        reservations = self.search([("table_id", "in", tables.ids), ("date", "=", date), ("state", "in", ACTIVE_STATES)],
                                   order="time_start, id")
        by_table = {}
        for reservation in reservations:
            by_table.setdefault(reservation.table_id.id, []).append(reservation._waiter_card_vals())
        return {
            "date": fields.Date.to_string(date),
            "slots": self.waiter_slots(config_id, date),
            "floors": [{"id": floor.id, "name": floor.name} for floor in config.floor_ids.filtered("active").sorted("sequence")],
            "tables": [dict(self._waiter_table_vals(table), reservations=by_table.get(table.id, []))
                       for table in self._waiter_sorted_tables(tables)],
        }

    def waiter_detail(self):
        """Detalle completo de cada reserva, con las líneas del pre-pedido (modal "Reservation Detail")."""
        result = []
        for reservation in self:
            vals = reservation._waiter_card_vals()
            order = reservation.preorder_id
            vals.update({
                "customer_email": reservation.customer_email or "", "customer_phone": reservation.customer_phone or "",
                "date": fields.Date.to_string(reservation.date), "notes": reservation.notes or "",
                "table": self._waiter_table_vals(reservation.table_id),
                "preorder_id": order.id or False, "preorder_state": order.state if order else False,
                "amount_total": reservation.amount_total, "currency_id": reservation.currency_id.id or False,
                "lines": [{
                    "id": line.id, "product_id": line.product_id.id, "product_tmpl_id": line.product_id.product_tmpl_id.id,
                    "name": line.full_product_name or line.product_id.display_name, "qty": line.qty,
                    "price_unit": line.price_unit, "price_subtotal": line.price_subtotal,
                    "price_subtotal_incl": line.price_subtotal_incl, "note": line.customer_note or "",
                } for line in order.lines] if order else [],
            })
            result.append(vals)
        return result

    def waiter_time_label(self):
        self.ensure_one()
        return "%s – %s" % (hour_label(self.time_start), hour_label(self.time_end))

    # ------------------------------------------------------------------ internos
    def _waiter_card_vals(self):
        self.ensure_one()
        return {
            "id": self.id, "name": self.name, "customer_name": self.customer_name, "people": self.people,
            "baby_chair": self.baby_chair, "state": self.state, "date": fields.Date.to_string(self.date),
            "time_start": self.time_start, "time_end": self.time_end, "label": hour_label(self.time_start),
            "time_label": self.waiter_time_label(), "table_id": self.table_id.id, "table_number": self.table_id.table_number,
            "floor_id": self.floor_id.id, "floor_name": self.floor_id.name or "",
        }

    @api.model
    def _waiter_table_vals(self, table):
        return {"id": table.id, "table_number": table.table_number, "name": table.display_name, "seats": table.seats,
                "floor_id": table.floor_id.id, "floor_name": table.floor_id.name or "", "shape": table.shape}

    @api.model
    def _waiter_sorted_tables(self, tables):
        return tables.sorted(lambda t: (t.floor_id.sequence, t.floor_id.id, t.table_number, t.id))

    @api.model
    def _waiter_tz(self):
        return pytz.timezone(self.env.context.get("tz") or self.env.user.tz or "UTC")

    @api.model
    def _waiter_now_hour(self):
        now = datetime.now(self._waiter_tz())
        return now.hour + now.minute / 60.0

    def _waiter_config(self):
        self.ensure_one()
        return self.table_id.floor_id.pos_config_ids[:1]

    def _waiter_preset_time(self):
        """Fecha y hora de inicio de la reserva en UTC, para `pos.order.preset_time`."""
        self.ensure_one()
        local = self._waiter_tz().localize(datetime.combine(self.date, datetime.min.time()) + timedelta(hours=self.time_start))
        return local.astimezone(pytz.utc).replace(tzinfo=None)

    def _create_preorder(self, lines, config_id=None):
        self.ensure_one()
        config = self.env["pos.config"].browse(config_id) if config_id else self._waiter_config()
        if not config:
            raise UserError(_("La mesa %s no pertenece a ningún punto de venta.", self.table_id.display_name))
        session = config.current_session_id
        if not session or session.state == "closed":
            raise UserError(_("Abre la caja de %s antes de registrar un pre-pedido.", config.name))
        preset = (self.env.ref("pos_restaurant.pos_takein_preset", raise_if_not_found=False)
                  or self.env["pos.preset"].search([("name", "ilike", "Dine In")], limit=1))
        order = self.env["pos.order"].create({
            "session_id": session.id, "preset_id": preset.id or False, "table_id": self.table_id.id,
            "customer_count": self.people, "floating_order_name": "%s · %s" % (self.name, self.customer_name),
            "preset_time": self._waiter_preset_time(), "amount_tax": 0.0, "amount_total": 0.0, "amount_paid": 0.0,
            "amount_return": 0.0, "lines": [Command.create(self._preorder_line_vals(order_config=config, **line)) for line in lines],
        })
        for line in order.lines:
            line.write(line._compute_amount_line_all())
        order._compute_prices()
        self.preorder_id = order
        return order

    def _preorder_line_vals(self, order_config, product_id=None, product_tmpl_id=None, qty=1.0, note="", **_ignored):
        Product = self.env["product.product"]
        product = Product.browse(product_id) if product_id else self.env["product.template"].browse(product_tmpl_id).product_variant_id
        if not product.exists():
            raise UserError(_("El producto del pre-pedido no existe."))
        company = order_config.company_id
        taxes = product.taxes_id.filtered_domain(self.env["account.tax"]._check_company_domain(company))
        fiscal_taxes = order_config.default_fiscal_position_id.map_tax(taxes)
        pricelist = order_config.pricelist_id
        price = pricelist._get_product_price(product, qty or 1.0) if pricelist else product.lst_price
        price_unit = self.env["account.tax"]._fix_tax_included_price_company(price, taxes, fiscal_taxes, company)
        return {
            "name": "%s %s" % (self.name, product.display_name), "product_id": product.id, "qty": qty or 1.0,
            "price_unit": price_unit, "tax_ids": [Command.set(taxes.ids)], "full_product_name": product.display_name,
            "customer_note": note or False, "price_subtotal": 0.0, "price_subtotal_incl": 0.0,
        }
