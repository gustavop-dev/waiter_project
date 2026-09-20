from odoo import fields, models


class RestaurantTable(models.Model):
    _inherit = "restaurant.table"

    def waiter_reserved_at(self, date=None):
        """Reserva que tiene apartada la mesa AHORA, para pintar "Reservada · 17:00" en el plano.

        Devuelve ``{table_id: {...} | False}``; por RPC las claves llegan como texto. Para hoy solo cuenta
        la que ya está dentro de su ventana: desde ``hold_start`` (la hora reservada menos el margen de
        preparación) hasta ``time_end``. Fuera de esa ventana la mesa se usa con normalidad, que es lo que
        evita que una reserva de las 20:00 deje la mesa muerta desde el almuerzo. Para otro día, la primera.
        """
        Reservation = self.env["waiter.reservation"]
        date = fields.Date.to_date(date) if date else fields.Date.context_today(self)
        now_hour = Reservation._waiter_now_hour() if date == fields.Date.context_today(self) else 0.0
        result = {table.id: False for table in self}
        domain = [("table_ids", "in", self.ids), ("date", "=", date), ("state", "=", "confirmed"), ("time_end", ">", now_hour)]
        if now_hour:
            # Hoy: solo la que ya empezó a apartarse. Las de más tarde no ocupan la mesa todavía.
            domain.append(("hold_start", "<=", now_hour))
        reservations = Reservation.search(domain, order="time_start, id")
        for reservation in reservations:
            for table in reservation.table_ids & self:
                if not result[table.id]:
                    result[table.id] = reservation._waiter_card_vals()
        return result
