"""Pedidos de WhatsApp: cotizar sin escribir; confirmar y enviar a cocina atómicamente."""
import hashlib
import json
import math
import re
from uuid import UUID, uuid5

from odoo import api, fields, models
from odoo.exceptions import UserError, ValidationError


class PosOrder(models.Model):
    _inherit = "pos.order"

    waiter_channel = fields.Selection([("whatsapp", "WhatsApp")], copy=False, index=True)
    waiter_channel_request = fields.Char(copy=False)

    def _channel_config(self, config_id):
        config = self.env["pos.config"].browse(config_id).exists()
        if not config:
            raise ValidationError("La sede no existe.")
        config.check_access("read")
        if config.company_id not in self.env.companies:
            raise ValidationError("La sede no pertenece a la compañía activa.")
        return config

    def _channel_values(self, config, lines, order_uuid):
        session = config.current_session_id
        if not session or session.state != "opened":
            raise UserError("Abre la caja del POS para recibir pedidos de WhatsApp.")
        preset = config.available_preset_ids.filtered(lambda p: p.service_at == "counter")[:1]
        if not preset:
            raise UserError("Configura un tipo de pedido para recoger en este POS.")
        if not isinstance(lines, list) or not 1 <= len(lines) <= 30:
            raise ValidationError("El pedido debe tener entre 1 y 30 líneas.")
        values = []
        quantities = {}
        for index, line in enumerate(lines):
            if not isinstance(line, dict) or set(line) - {"producto", "cantidad", "nota"}:
                raise ValidationError("La línea solo acepta producto, cantidad y nota.")
            pid, qty, note = line.get("producto"), line.get("cantidad"), line.get("nota", "")
            if type(pid) is not int or type(qty) is not int or not 1 <= qty <= 50:
                raise ValidationError("Producto o cantidad inválidos.")
            if not isinstance(note, str) or len(note) > 500:
                raise ValidationError("Nota inválida.")
            product = self.env["product.product"].browse(pid).exists()
            product.check_access("read")
            if not product or not product.active or not product.available_in_pos or not product.sale_ok:
                raise ValidationError("El producto no está disponible en la carta.")
            if product.company_id and product.company_id != config.company_id:
                raise ValidationError("El producto no pertenece a esta compañía.")
            if config.iface_available_categ_ids and not (product.pos_categ_ids & config.iface_available_categ_ids):
                raise ValidationError("El producto no está en la carta de esta sede.")
            if product.type == "combo" or product.product_tmpl_id.attribute_line_ids:
                raise ValidationError("Este producto requiere opciones; debe atenderlo el personal.")
            quantities[pid] = quantities.get(pid, 0) + qty
            if product.is_storable and product.with_company(config.company_id).qty_available < quantities[pid]:
                raise ValidationError("No hay existencias suficientes del producto.")
            values.append((0, 0, {
                "uuid": str(uuid5(UUID(order_uuid), str(index))), "product_id": pid, "qty": qty,
                "price_unit": 0, "price_subtotal": 0, "price_subtotal_incl": 0,
                "full_product_name": product.display_name, "customer_note": note.strip(),
            }))
        return {
            "uuid": order_uuid, "session_id": session.id, "company_id": config.company_id.id,
            "preset_id": preset.id, "pricelist_id": (preset.pricelist_id or config.pricelist_id).id,
            "fiscal_position_id": (preset.fiscal_position_id or config.default_fiscal_position_id).id,
            "state": "draft", "amount_paid": 0, "amount_return": 0, "amount_tax": 0, "amount_total": 0,
            "date_order": fields.Datetime.now(), "lines": values,
        }

    def _channel_summary(self):
        self.ensure_one()
        return {
            "moneda": self.currency_id.name,
            "total": self.amount_total, "impuestos": self.amount_tax,
            "lineas": [{"producto": line.product_id.id, "nombre": line.full_product_name,
                        "cantidad": line.qty, "nota": line.customer_note or "",
                        "precio_base": line.price_unit, "total": line.price_subtotal_incl}
                       for line in self.lines],
        }

    @staticmethod
    def _channel_digest(value):
        return hashlib.sha256(json.dumps(value, sort_keys=True, ensure_ascii=True).encode()).hexdigest()

    @api.model
    def waiter_whatsapp_quote(self, config_id, lines):
        config = self._channel_config(config_id)
        # Un registro en memoria usa los mismos impuestos y precios que el POS sin crear pedido ni comanda.
        draft = self.new(self._channel_values(config, lines, "00000000-0000-0000-0000-000000000000"))
        draft.recompute_prices()
        summary = draft._channel_summary()
        return {**summary, "cotizacion": self._channel_digest(summary)}

    @api.model
    def waiter_whatsapp_confirm(self, config_id, order_uuid, lines, customer, quote, expires_at):
        order_uuid = str(UUID(order_uuid))
        if not isinstance(customer, dict) or set(customer) != {"nombre", "telefono"}:
            raise ValidationError("Datos de cliente inválidos.")
        if not isinstance(customer["nombre"], str) or not 1 <= len(customer["nombre"].strip()) <= 100:
            raise ValidationError("Nombre inválido.")
        if not isinstance(customer["telefono"], str) or not re.fullmatch(r"\+[1-9][0-9]{7,14}", customer["telefono"]):
            raise ValidationError("Teléfono inválido; usa formato internacional.")
        config = self._channel_config(config_id)
        # Serializa reintentos concurrentes; no dependemos de sync_from_ui, que solo busca pedidos abiertos.
        self.env.cr.execute("SELECT id FROM pos_config WHERE id = %s FOR UPDATE", [config.id])
        fingerprint = self._channel_digest([config_id, lines, customer, quote, expires_at])
        existing = self.search([("uuid", "=", order_uuid)], limit=1)
        if existing:
            existing.check_access("read")
            if existing.config_id != config or existing.waiter_channel_request != fingerprint:
                raise ValidationError("La referencia ya pertenece a otro pedido.")
            return existing._channel_result()
        if fields.Datetime.to_datetime(expires_at) <= fields.Datetime.now():
            raise UserError("La cotización venció; prepara y confirma un nuevo resumen.")
        current = self.waiter_whatsapp_quote(config.id, lines)
        if current["cotizacion"] != quote:
            raise UserError("La carta cambió; prepara y confirma un nuevo resumen.")
        values = self._channel_values(config, lines, order_uuid)
        values.update({"waiter_channel": "whatsapp", "waiter_origin": "ai",
                       "waiter_channel_request": fingerprint, "delivery_phone": customer["telefono"],
                       "floating_order_name": "WhatsApp · " + customer["nombre"].strip(),
                       "general_customer_note": "Para recoger · Pago pendiente · " + customer["telefono"]})
        order = self.create(values)
        order.recompute_prices()
        if self._channel_digest(order._channel_summary()) != quote or not math.isfinite(order.amount_total):
            raise UserError("El total cambió; vuelve a cotizar antes de confirmar.")
        self.env["restaurant.order.course"].kitchen_fire(order.id, order.lines.ids)
        self.env["waiter.bus"].waiter_send([config.id], "orders")
        return order._channel_result()

    def _channel_result(self):
        self.ensure_one()
        # El POS muestra orderNumber(type, tracking_number): la referencia compartida debe coincidir.
        digits = re.sub(r"\D", "", str(self.tracking_number or self.id)) or "0"
        reference = {"table": "DI", "counter": "TA", "delivery": "DE"}.get(self.preset_id.service_at, "TA") + digits.zfill(3)
        return {"id": self.id, "referencia": reference,
                "estado": self.state, "pagado": self.amount_paid, **self._channel_summary()}
