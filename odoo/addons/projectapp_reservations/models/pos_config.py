from odoo import api, fields, models, _
from odoo.exceptions import ValidationError


class PosConfig(models.Model):
    _inherit = "pos.config"

    reservation_open = fields.Float(string="Reservas desde (hora)", default=10.0,
                                    help="Primera franja de reserva del día, en horas (10.5 = 10:30).")
    reservation_close = fields.Float(string="Reservas hasta (hora)", default=22.0,
                                     help="Hora de cierre de las reservas; la última franja empieza media hora antes.")

    @api.constrains("reservation_open", "reservation_close")
    def _check_reservation_hours(self):
        for config in self:
            if not (0 <= config.reservation_open < config.reservation_close <= 24):
                raise ValidationError(_("El horario de reservas debe cumplir 0 ≤ apertura < cierre ≤ 24."))
