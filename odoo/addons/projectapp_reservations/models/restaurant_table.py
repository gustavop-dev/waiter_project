from odoo import fields, models


class RestaurantTable(models.Model):
    _inherit = "restaurant.table"

    def waiter_reserved_at(self, date=None):
        """Próxima reserva confirmada del día para cada mesa, para pintar "Reservada · 17:00" en el plano.

        Devuelve ``{table_id: {...} | False}``; por RPC las claves llegan como texto. Para hoy solo cuenta
        lo que aún no terminó (``time_end`` > hora actual del usuario); para otro día, la primera del día.
        """
        Reservation = self.env["waiter.reservation"]
        date = fields.Date.to_date(date) if date else fields.Date.context_today(self)
        now_hour = Reservation._waiter_now_hour() if date == fields.Date.context_today(self) else 0.0
        result = {table.id: False for table in self}
        reservations = Reservation.search([
            ("table_id", "in", self.ids), ("date", "=", date), ("state", "=", "confirmed"), ("time_end", ">", now_hour),
        ], order="time_start, id")
        for reservation in reservations:
            if not result[reservation.table_id.id]:
                result[reservation.table_id.id] = reservation._waiter_card_vals()
        return result
