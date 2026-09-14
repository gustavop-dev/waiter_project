from datetime import timedelta
from uuid import uuid4
from unittest.mock import patch

from odoo import fields
from odoo.exceptions import UserError, ValidationError
from odoo.tests import tagged

from .test_kit import KitCase


@tagged("post_install", "-at_install")
class TestChannelOrders(KitCase):
    def setUp(self):
        super().setUp()
        self.session.state = "opened"
        self.config.iface_available_categ_ids = False
        self.product.taxes_id = False
        self.orders = self.env["pos.order"]
        self.lines = [{"producto": self.product.id, "cantidad": 2, "nota": "Sin sal"}]
        self.customer = {"nombre": "Cliente prueba", "telefono": "+573001234567"}
        self.expiry = fields.Datetime.to_string(fields.Datetime.now() + timedelta(minutes=10))

    def quote(self):
        return self.orders.waiter_whatsapp_quote(self.config.id, self.lines)

    def confirm(self, quote=None, uid=None, expiry=None):
        return self.orders.waiter_whatsapp_confirm(self.config.id, uid or str(uuid4()), self.lines,
                                                  self.customer, (quote or self.quote())["cotizacion"],
                                                  expiry or self.expiry)

    def test_quote_has_real_prices_without_creating_orders(self):
        before = self.orders.search_count([])
        quote = self.quote()
        self.assertEqual(quote["total"], 24000)
        self.assertEqual(self.orders.search_count([]), before)

    def test_confirm_is_unpaid_pickup_and_retry_never_duplicates_even_after_payment(self):
        quote, uid = self.quote(), str(uuid4())
        first = self.confirm(quote, uid)
        order = self.orders.browse(first["id"])
        self.assertEqual(first['referencia'], 'TA' + str(order.tracking_number or order.id).zfill(3))
        self.assertEqual(order.waiter_channel, "whatsapp")
        self.assertEqual(order.preset_id.service_at, "counter")
        self.assertFalse(order.table_id)
        self.assertEqual((order.state, order.amount_paid), ("draft", 0))
        self.assertEqual(len(order.course_ids), 1)
        self.assertTrue(order.course_ids.fired)
        self.assertFalse(order.payment_ids)
        self.assertEqual(self.confirm(quote, uid)["id"], order.id)
        order.state = "paid"
        self.assertEqual(self.confirm(quote, uid)["id"], order.id)
        self.assertEqual(len(order.course_ids), 1)
        self.assertEqual(self.orders.search_count([("uuid", "=", uid)]), 1)

    def test_changed_price_and_expired_quote_do_not_send_to_kitchen(self):
        quote = self.quote()
        self.product.lst_price = 15000
        with self.assertRaises(UserError):
            self.confirm(quote)
        with self.assertRaises(UserError):
            self.confirm(expiry="2020-01-01 00:00:00")

    def test_invalid_and_sold_out_products_are_rejected(self):
        for lines in ([], [{"producto": self.product.id, "cantidad": -1}],
                      [{"producto": self.product.id, "cantidad": 1, "precio": 1}],
                      [{"producto": 999999999, "cantidad": 1}]):
            with self.assertRaises(ValidationError):
                self.orders.waiter_whatsapp_quote(self.config.id, lines)
        self.product.is_storable = True
        with self.assertRaises(ValidationError):
            self.quote()

    def test_same_uuid_cannot_replace_customer_or_lines(self):
        quote, uid = self.quote(), str(uuid4())
        self.confirm(quote, uid)
        self.customer["nombre"] = "Otra persona"
        with self.assertRaises(ValidationError):
            self.confirm(quote, uid)

    def test_closed_register_is_not_automatically_opened(self):
        self.session.state = "closing_control"
        with self.assertRaises(UserError):
            self.quote()
        self.assertEqual(self.session.state, "closing_control")

    def test_taxes_come_from_odoo_and_are_preserved_on_confirmation(self):
        tax = self.env['account.tax'].create({'name': 'IVA prueba canal', 'amount': 19,
                                            'amount_type': 'percent', 'type_tax_use': 'sale',
                                            'company_id': self.config.company_id.id})
        self.product.taxes_id = tax
        quote = self.quote()
        self.assertEqual(quote['total'], 28560)
        self.assertEqual(quote['impuestos'], 4560)
        self.assertEqual(self.confirm(quote)['total'], quote['total'])

    def test_kitchen_failure_rolls_back_the_order(self):
        before = self.orders.search_count([])
        with self.assertRaises(UserError), self.env.cr.savepoint():
            with patch.object(type(self.env['restaurant.order.course']), 'kitchen_fire', side_effect=UserError('Sin cocina')):
                self.confirm()
        self.assertEqual(self.orders.search_count([]), before)
