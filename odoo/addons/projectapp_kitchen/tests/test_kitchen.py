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

    def test_kitchen_marks_dishes_ready_one_by_one(self):
        """Atrapa un curso que quede listo con un plato todavía en el fuego: cocina saca de uno en uno."""
        course = self._fire(self.line_a | self.line_b)
        self.assertEqual(self.Line.action_kitchen_line_ready([self.line_a.id]), [])
        self.assertTrue(self.line_a.waiter_ready_date)
        self.assertFalse(course.ready_date)
        self.assertEqual(self.Line.action_kitchen_line_ready([self.line_b.id]), [course.id])
        self.assertTrue(course.ready_date)

    def test_the_waiter_cannot_deliver_what_the_kitchen_has_not_finished(self):
        """La regla vive aquí y no en la pantalla: tres pantallas ofrecen entregar."""
        course = self._fire(self.line_a | self.line_b)
        with self.assertRaises(UserError):
            self.Line.action_kitchen_line_served([self.line_a.id])
        self.assertFalse(self.line_a.served_date)
        with self.assertRaises(UserError):
            course.action_kitchen_served()
        self.Line.action_kitchen_line_ready([self.line_a.id])
        self.assertEqual(self.Line.action_kitchen_line_served([self.line_a.id]), [])
        self.assertTrue(self.line_a.served_date)
        self.assertFalse(course.served_date, "el otro plato sigue en cocina")

    def test_serving_every_line_closes_the_course(self):
        """Atrapa un curso que quede servido con una línea pendiente, o una línea servida sin hora del servidor."""
        course = self._fire(self.line_a | self.line_b)
        course.action_kitchen_ready()
        self.assertEqual(self.Line.action_kitchen_line_served([self.line_a.id]), [])
        self.assertTrue(self.line_a.served_date)
        self.assertFalse(course.served_date)
        self.assertEqual(self.Line.action_kitchen_line_served([self.line_b.id]), [course.id])
        self.assertTrue(course.served_date)

    def test_delivering_everything_only_takes_what_is_ready(self):
        """«Entregar todo» del mesero se lleva lo que está en el pase; lo que sigue en cocina se queda."""
        course = self._fire(self.line_a | self.line_b)
        self.Line.action_kitchen_line_ready([self.line_a.id])
        first_ready = self.line_a.waiter_ready_date
        course.action_kitchen_served()
        self.assertTrue(self.line_a.served_date)
        self.assertFalse(self.line_b.served_date, "el plato que sigue en cocina no se entrega solo")
        self.assertFalse(course.served_date)
        self.Line.action_kitchen_line_ready([self.line_b.id])
        self.assertEqual(self.line_a.waiter_ready_date, first_ready, "un plato ya listo conserva su hora")
        course.action_kitchen_served()
        self.assertTrue(course.served_date and self.line_b.served_date)

    def test_cancel_received_but_not_started(self):
        course = self._fire(self.line_a | self.line_b)
        self.Line.waiter_cancel_lines(self.line_a.ids)
        self.assertFalse(self.line_a.exists())
        course.action_kitchen_start()
        first = course.preparation_date
        course.action_kitchen_start()
        self.assertEqual(course.preparation_date, first)
        with self.assertRaises(UserError):
            self.Line.waiter_cancel_lines(self.line_b.ids)
        with self.assertRaises(UserError):
            self.line_b.unlink()
        with self.assertRaises(UserError):
            self.line_b.write({"qty": 2})
        self.assertTrue(self.line_b.exists())

    def test_cancelling_all_lines_releases_the_order(self):
        course = self._fire(self.order.lines)
        self.Line.waiter_cancel_lines(self.order.lines.ids)
        self.assertEqual(self.order.state, "cancel")
        self.assertFalse(self.order.lines)
        self.assertFalse(course.exists())
        self.assertEqual(self.order.amount_total, 0)

    def test_dispatch_retry_does_not_move_lines_to_another_course(self):
        course = self._fire(self.line_a)
        self.assertFalse(self.env["restaurant.order.course"].kitchen_fire(self.order.id, self.line_a.ids))
        self.assertEqual(self.line_a.course_id, course)

    def test_paid_takeaway_can_be_prepared_but_not_cancelled(self):
        self.order.write({"state": "paid"})
        course = self._fire(self.line_a)
        course.action_kitchen_start()
        course.action_kitchen_ready()
        course.action_kitchen_served()
        self.assertTrue(self.line_a.served_date)
        with self.assertRaises(UserError):
            self.Line.waiter_cancel_lines(self.line_a.ids)

    def test_new_fields_travel_in_load_data(self):
        self.assertTrue({"waiter_ready_date", "served_date", "waiter_cancelled"} <= set(self.Line._load_pos_data_fields(self.config)))
        self.assertTrue({"ready_date", "served_date"} <= set(self.env["restaurant.order.course"]._load_pos_data_fields(self.config)))
