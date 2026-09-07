"""Servido por línea y cancelación antes de cocina, sobre los cursos de Odoo.

Corren con el runner de Odoo (`-u projectapp_kitchen --test-enable --test-tags /projectapp_kitchen`).
"""
from odoo import fields
from odoo.exceptions import UserError
from odoo.tests import TransactionCase, tagged


@tagged("post_install", "-at_install")
class TestKitchenLines(TransactionCase):
    def setUp(self):
        super().setUp()
        self.config = self.env["pos.config"].search([("module_pos_restaurant", "=", True)], limit=1) or self.env["pos.config"].search([], limit=1)
        self.assertTrue(self.config, "hace falta un pos.config (demo)")
        self.session = self.config.current_session_id or self.env["pos.session"].create({"config_id": self.config.id, "user_id": self.env.uid})
        self.product = self.env["product.product"].create({"name": "Bandeja de prueba", "available_in_pos": True, "lst_price": 30000})
        self.order = self.env["pos.order"].create({
            "company_id": self.env.company.id, "session_id": self.session.id, "date_order": fields.Datetime.now(),
            "amount_tax": 0.0, "amount_total": 60000.0, "amount_paid": 0.0, "amount_return": 0.0,
            "lines": [(0, 0, {"product_id": self.product.id, "qty": 1, "price_unit": 30000, "price_subtotal": 30000, "price_subtotal_incl": 30000})
                      for _ in range(3)],
        })
        self.line_a, self.line_b, self.line_c = self.order.lines
        self.Line = self.env["pos.order.line"]

    def _fire(self, lines):
        return self.env["restaurant.order.course"].browse(self.env["restaurant.order.course"].kitchen_fire(self.order.id, lines.ids))

    def test_serving_every_line_closes_the_course(self):
        """Atrapa un curso que quede servido con una línea pendiente, o una línea servida sin hora del servidor."""
        course = self._fire(self.line_a | self.line_b)
        self.assertEqual(self.Line.action_kitchen_line_served([self.line_a.id]), [])
        self.assertTrue(self.line_a.served_date)
        self.assertFalse(course.served_date)
        self.assertEqual(self.Line.action_kitchen_line_served([self.line_b.id]), [course.id])
        self.assertTrue(course.served_date)

    def test_serving_the_course_marks_every_line(self):
        course = self._fire(self.line_a | self.line_b)
        self.Line.action_kitchen_line_served([self.line_a.id])
        first_served = self.line_a.served_date
        course.action_kitchen_served()
        self.assertTrue(course.served_date and self.line_b.served_date)
        self.assertEqual(self.line_a.served_date, first_served, "una línea ya servida conserva su hora")

    def test_cancel_only_before_the_course_is_fired(self):
        """Atrapa que se cancele un plato ya enviado a cocina."""
        fired = self._fire(self.line_a)
        waiting = self.env["restaurant.order.course"].create({"order_id": self.order.id, "index": 2, "fired": False, "line_ids": [(6, 0, [self.line_b.id, self.line_c.id])]})
        with self.assertRaises(UserError):
            self.Line.waiter_cancel_lines([self.line_a.id])
        self.assertFalse(self.line_a.waiter_cancelled)
        self.assertTrue(self.Line.waiter_cancel_lines([self.line_b.id]))
        self.assertEqual((self.line_b.waiter_cancelled, bool(waiting.served_date)), (True, False))
        self.Line.action_kitchen_line_served([self.line_c.id])
        self.assertTrue(waiting.served_date, "una línea cancelada no bloquea el cierre del curso")
        self.assertFalse(fired.served_date)

    def test_new_fields_travel_in_load_data(self):
        self.assertTrue({"served_date", "waiter_cancelled"} <= set(self.Line._load_pos_data_fields(self.config)))
        self.assertTrue({"ready_date", "served_date"} <= set(self.env["restaurant.order.course"]._load_pos_data_fields(self.config)))
