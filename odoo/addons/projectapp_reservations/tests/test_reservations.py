"""Reservas del kit: solape, franjas, mesas disponibles, pre-pedido con correo, timeline y estados.

Corren con el runner de Odoo (`-u projectapp_reservations --test-enable --test-tags /projectapp_reservations`).
"""
from datetime import date

from odoo import fields
from odoo.exceptions import UserError, ValidationError
from odoo.tests import TransactionCase, tagged


@tagged("post_install", "-at_install")
class TestReservations(TransactionCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.config = cls.env["pos.config"].search([("module_pos_restaurant", "=", True)], limit=1)
        assert cls.config, "hace falta un pos.config de restaurante (demo)"
        cls.floor = cls.env["restaurant.floor"].create({"name": "Terraza de pruebas", "pos_config_ids": [(4, cls.config.id)]})
        Table = cls.env["restaurant.table"]
        cls.t2, cls.t4, cls.t8 = (Table.create({"floor_id": cls.floor.id, "table_number": number, "seats": seats})
                                  for number, seats in ((901, 2), (902, 4), (903, 8)))
        cls.session = cls.config.current_session_id or cls.env["pos.session"].create({"config_id": cls.config.id, "user_id": cls.env.uid})
        cls.product = cls.env["product.template"].create({"name": "Bowl de pruebas", "list_price": 25000, "available_in_pos": True})
        cls.day = date(2030, 10, 15)
        cls.Reservation = cls.env["waiter.reservation"]

    def _reserve(self, table, time_start, **vals):
        base = {"customer_name": "Bruno", "date": self.day, "time_start": time_start, "people": 2, "table_id": table.id}
        base.update(vals)
        return self.Reservation.create(base)

    def _lines(self, note="Sin cebolla"):
        return [{"product_id": self.product.product_variant_id.id, "qty": 2, "note": note}]

    def test_overlapping_reservations_on_the_same_table_are_rejected(self):
        """Falla si dos reservas activas comparten mesa y franja, si una cancelada sigue bloqueando o si la hora no es de 30 min."""
        first = self._reserve(self.t4, 12.0, prep_minutes="0")
        self.assertEqual((first.time_end, first.state, first.floor_id), (13.5, "confirmed", self.floor))
        with self.assertRaises(ValidationError):
            self._reserve(self.t4, 13.0, prep_minutes="0")
        with self.assertRaises(ValidationError):
            self._reserve(self.t4, 11.0, time_end=12.5, prep_minutes="0")
        self._reserve(self.t4, 13.5, prep_minutes="0")
        self._reserve(self.t2, 12.0, prep_minutes="0")
        first.action_cancel()
        self._reserve(self.t4, 12.0, prep_minutes="0")
        with self.assertRaises(ValidationError):
            self._reserve(self.t8, 12.25)

    def test_the_prep_margin_holds_the_table_before_the_hour_and_frees_the_rest_of_the_day(self):
        """El margen es para preparar la mesa, no porque el comensal esté ya ahí: una reserva de la noche
        no puede dejar la mesa muerta desde el almuerzo, y media hora antes sí la aparta."""
        night = self._reserve(self.t4, 20.0, prep_minutes="30")
        self.assertEqual((night.hold_start, night.time_end), (19.5, 21.5))
        # A mediodía la mesa se usa con normalidad.
        self.assertIn(self.t4.id, [t["id"] for t in self.Reservation.waiter_available_tables(self.config.id, self.day, 13.0, 3)])
        # Dentro del margen ya no: una reserva que acabe a las 19:45 pisa la preparación.
        with self.assertRaises(ValidationError):
            self._reserve(self.t4, 18.5, time_end=19.75, prep_minutes="0")
        # Sin margen, esa misma reserva cabe.
        night.write({"prep_minutes": "0"})
        self.assertEqual(night.hold_start, 20.0)
        self._reserve(self.t4, 18.5, time_end=19.75, prep_minutes="0")

    def test_the_floor_only_shows_the_reservation_that_holds_the_table_now(self):
        """Falla si el plano pinta "Reservada" por una reserva de dentro de seis horas."""
        table = self.env["restaurant.table"].create({"floor_id": self.floor.id, "table_number": 904, "seats": 4})
        today = fields.Date.context_today(self.Reservation)
        now = self.Reservation._waiter_now_hour()
        self._reserve(table, min(23.0, float(int(now + 4)) ), date=today, prep_minutes="30")
        self.assertFalse(table.waiter_reserved_at(today)[table.id], "todavía no la aparta")

    def test_slots_follow_the_config_hours_and_available_tables_skip_clashes_and_small_tables(self):
        """Falla si las franjas no van de 10:00 a 21:30 cada 30 min, si el pos.config no las configura o si una mesa ocupada o pequeña se ofrece."""
        slots = self.Reservation.waiter_slots(self.config.id, self.day)
        self.assertEqual(len(slots), 24)
        self.assertEqual((slots[0], slots[-1]["label"]), ({"time": 10.0, "label": "10:00", "past": False}, "21:30"))
        self.config.write({"reservation_open": 12.0, "reservation_close": 14.0})
        self.assertEqual([s["label"] for s in self.Reservation.waiter_slots(self.config.id, self.day)], ["12:00", "12:30", "13:00", "13:30"])
        self._reserve(self.t4, 12.0, prep_minutes="0")
        free = [t["id"] for t in self.Reservation.waiter_available_tables(self.config.id, self.day, 13.0, 3, prep_minutes="0")]
        self.assertNotIn(self.t4.id, free)
        self.assertNotIn(self.t2.id, free)
        self.assertIn(self.t8.id, free)
        self.assertIn(self.t4.id, [t["id"] for t in self.Reservation.waiter_available_tables(self.config.id, self.day, 13.5, 3, prep_minutes="0")])
        by_id = {t["id"]: t for t in self.Reservation.waiter_available_tables(self.config.id, self.day, 13.0, 3, include_unavailable=True, prep_minutes="0")}
        self.assertEqual((by_id[self.t4.id]["status"], by_id[self.t4.id]["reserved_at"], by_id[self.t2.id]["status"]), ("reserved", "12:00", "unavailable"))

    def test_waiter_create_builds_the_dine_in_preorder_and_queues_the_confirmation_mail(self):
        """Falla si el código no es RVnnn, si el pre-pedido no es un borrador Dine In con las líneas, o si no sale el correo."""
        before = self.env["mail.mail"].search([])
        detail = self.Reservation.waiter_create({
            "customer_name": "Nadia Olivia", "customer_email": "nadia@example.com", "date": "2030-10-15", "time_start": 15.0,
            "people": 2, "baby_chair": True, "table_id": self.t4.id, "config_id": self.config.id,
        }, self._lines())
        reservation = self.Reservation.browse(detail["id"])
        self.assertRegex(reservation.name, r"^RV\d{3}$")
        self.assertEqual((detail["time_label"], detail["baby_chair"], len(detail["lines"])), ("15:00 – 16:30", True, 1))
        order = reservation.preorder_id
        self.assertEqual((order.state, order.preset_id.name, order.table_id, order.customer_count), ("draft", "Dine In", self.t4, 2))
        self.assertEqual((order.lines.qty, order.lines.customer_note), (2, "Sin cebolla"))
        self.assertGreater(order.amount_total, 0)
        self.assertEqual(detail["amount_total"], order.amount_total)
        mail = self.env["mail.mail"].search([]) - before
        self.assertEqual((len(mail), mail.email_to), (1, "nadia@example.com"))
        self.assertIn(reservation.name, mail.subject)
        self.assertIn("Sin cebolla", mail.body_html)
        self.assertNotIn(order, self.session.get_session_orders(), "un pre-pedido futuro no bloquea el cierre de la caja")

    def test_a_reservation_without_email_sends_nothing(self):
        before = self.env["mail.mail"].search([])
        self._reserve(self.t2, 20.0, customer_email=False)
        self.assertFalse(self.env["mail.mail"].search([]) - before)

    def test_timeline_and_reserved_at_show_the_next_reservation_per_table(self):
        """Falla si la grilla no trae mesas × reservas del piso pedido o si el plano no sabe la próxima reserva de la mesa."""
        first = self._reserve(self.t4, 12.0, customer_name="Eva", people=4)
        second = self._reserve(self.t4, 17.0)
        self._reserve(self.t8, 11.5)
        timeline = self.Reservation.waiter_timeline(self.config.id, self.day, self.floor.id)
        self.assertEqual([t["id"] for t in timeline["tables"]], [self.t2.id, self.t4.id, self.t8.id])
        rows = {t["id"]: t["reservations"] for t in timeline["tables"]}
        self.assertEqual(([r["name"] for r in rows[self.t4.id]], rows[self.t2.id]), ([first.name, second.name], []))
        self.assertEqual((rows[self.t4.id][0]["label"], rows[self.t4.id][0]["people"], len(timeline["slots"])), ("12:00", 4, 24))
        self.assertIn({"id": self.floor.id, "name": "Terraza de pruebas"}, timeline["floors"])
        reserved = (self.t2 | self.t4 | self.t8).waiter_reserved_at(self.day)
        self.assertEqual((reserved[self.t2.id], reserved[self.t4.id]["label"], reserved[self.t4.id]["customer_name"]), (False, "12:00", "Eva"))
        first.action_seated()
        self.assertEqual(self.t4.waiter_reserved_at(self.day)[self.t4.id]["name"], second.name)

    def test_state_actions_move_the_preorder_along(self):
        """Falla si sentar no deja el pre-pedido visible en la sesión, si cancelar no anula el borrador o si se repite una transición."""
        seated = self.Reservation.browse(self.Reservation.waiter_create(
            {"customer_name": "Huston", "date": self.day, "time_start": 12.5, "people": 2, "table_id": self.t8.id}, self._lines())["id"])
        seated.action_seated()
        self.assertEqual((seated.state, seated.preorder_id.preset_time), ("seated", False))
        self.assertIn(seated.preorder_id, self.session.get_session_orders())
        with self.assertRaises(UserError):
            seated.action_seated()
        absent = self._reserve(self.t2, 12.5)
        absent.action_no_show()
        self.assertEqual(absent.state, "no_show")
        with self.assertRaises(UserError):
            absent.action_cancel()
        cancelled = self.Reservation.browse(self.Reservation.waiter_create(
            {"customer_name": "Eva", "date": self.day, "time_start": 19.0, "people": 3, "table_id": self.t4.id}, self._lines())["id"])
        cancelled.action_cancel()
        self.assertEqual((cancelled.state, cancelled.preorder_id.state), ("cancelled", "cancel"))
