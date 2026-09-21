from datetime import date as date_type

from odoo import api, fields, models, _
from odoo.exceptions import ValidationError

MAX_RANGES_PER_DAY = 4
MAX_OVERRIDES = 366
MAX_NOTE = 80
MAX_NOTICE_MINUTES = 7 * 24 * 60
MAX_DAYS_AHEAD = 730
NO_RULES = {"minNotice": 0, "maxDays": 0}
WEEKDAYS = tuple(str(day) for day in range(7))  # 0 = lunes … 6 = domingo, como date.weekday()


def clean_ranges(ranges):
    """Franjas de un día: [[inicio, fin], …] en horas (12.5 = 12:30), en medias horas, ordenadas y sin pisarse."""
    if not isinstance(ranges, list) or len(ranges) > MAX_RANGES_PER_DAY:
        raise ValidationError(_("Cada día admite hasta %s franjas.", MAX_RANGES_PER_DAY))
    clean, previous_end = [], -1.0
    for item in ranges:
        if not isinstance(item, (list, tuple)) or len(item) != 2 or any(isinstance(v, bool) or not isinstance(v, (int, float)) for v in item):
            raise ValidationError(_("Cada franja necesita una hora de inicio y una de fin."))
        start, end = float(item[0]), float(item[1])
        if not (0 <= start < end <= 24) or any(abs(v * 2 - round(v * 2)) > 1e-6 for v in (start, end)):
            raise ValidationError(_("Cada franja debe empezar antes de terminar, dentro del día y en medias horas (12:00, 12:30…)."))
        if start < previous_end - 1e-6:
            raise ValidationError(_("Las franjas de un mismo día no pueden pisarse y van en orden."))
        clean.append([start, end])
        previous_end = end
    return clean


def clean_rules(rules):
    """Reglas de antelación: ``minNotice`` = minutos mínimos entre ahora y la hora reservada; ``maxDays`` = hasta cuántos
    días hacia adelante se reserva. 0 = sin límite. Un horario guardado antes de existir las reglas no las trae."""
    rules = dict(NO_RULES, **(rules or {})) if isinstance(rules, dict) or not rules else None
    if rules is None or set(rules) != set(NO_RULES) or any(isinstance(v, bool) or not isinstance(v, int) for v in rules.values()):
        raise ValidationError(_("Las reglas de antelación no son válidas."))
    if not (0 <= rules["minNotice"] <= MAX_NOTICE_MINUTES and rules["minNotice"] % 30 == 0):
        raise ValidationError(_("La antelación mínima va en medias horas, hasta 7 días."))
    if not 0 <= rules["maxDays"] <= MAX_DAYS_AHEAD:
        raise ValidationError(_("La ventana de reservas admite hasta %s días.", MAX_DAYS_AHEAD))
    return rules


def clean_schedule(schedule):
    """Valida y normaliza el horario de reservas. Forma:
    ``{"weekly": {"0": [[12, 15], [18, 22.5]], …, "6": []}, "overrides": [{"date": "2026-12-24", "ranges": [[12, 16]], "note": "Nochebuena"}]}``.
    Un día sin franjas está cerrado. Una fecha especial reemplaza por completo al día de la semana que le tocaría.
    Lleva además ``"rules"`` (ver `clean_rules`)."""
    if not isinstance(schedule, dict) or not isinstance(schedule.get("weekly"), dict) or set(schedule["weekly"]) != set(WEEKDAYS):
        raise ValidationError(_("El horario semanal debe traer los siete días."))
    overrides = schedule.get("overrides") or []
    if not isinstance(overrides, list) or len(overrides) > MAX_OVERRIDES:
        raise ValidationError(_("Hay demasiadas fechas especiales (máximo %s).", MAX_OVERRIDES))
    clean, seen = [], set()
    for item in overrides:
        if not isinstance(item, dict):
            raise ValidationError(_("Una fecha especial no es válida."))
        try:
            day = date_type.fromisoformat(item.get("date") or "").isoformat()
        except (TypeError, ValueError):
            raise ValidationError(_("Una fecha especial no tiene una fecha válida."))
        if day in seen:
            raise ValidationError(_("La fecha %s está repetida en las fechas especiales.", day))
        seen.add(day)
        note = item.get("note") or ""
        if not isinstance(note, str) or len(note) > MAX_NOTE:
            raise ValidationError(_("La nota de una fecha especial admite hasta %s caracteres.", MAX_NOTE))
        clean.append({"date": day, "ranges": clean_ranges(item.get("ranges") or []), "note": note.strip()})
    return {"weekly": {day: clean_ranges(schedule["weekly"][day]) for day in WEEKDAYS}, "overrides": sorted(clean, key=lambda o: o["date"]),
            "rules": clean_rules(schedule.get("rules"))}


class PosConfig(models.Model):
    _inherit = "pos.config"

    reservation_open = fields.Float(string="Reservas desde (hora)", default=10.0,
                                    help="Primera franja de reserva del día, en horas (10.5 = 10:30).")
    reservation_close = fields.Float(string="Reservas hasta (hora)", default=22.0,
                                     help="Hora de cierre de las reservas; la última franja empieza media hora antes.")
    # Horario de reservas por día de la semana, con varias franjas y fechas especiales (ver `clean_schedule`).
    # Vacío = el horario anterior: `reservation_open`–`reservation_close` todos los días.
    reservation_schedule = fields.Json(string="Horario de reservas")

    @api.constrains("reservation_open", "reservation_close")
    def _check_reservation_hours(self):
        for config in self:
            if not (0 <= config.reservation_open < config.reservation_close <= 24):
                raise ValidationError(_("El horario de reservas debe cumplir 0 ≤ apertura < cierre ≤ 24."))

    @api.constrains("reservation_schedule")
    def _check_reservation_schedule(self):
        for config in self.filtered("reservation_schedule"):
            clean_schedule(config.reservation_schedule)  # un write directo tampoco puede dejar un horario imposible

    def waiter_reservation_schedule(self):
        """Horario completo para el editor. Sin horario configurado devuelve el anterior repetido los siete días."""
        self.ensure_one()
        # Se normaliza al leer: un write directo puede guardar un horario válido pero incompleto (sin «overrides» o sin
        # «rules»), y quien lo lea después necesita la forma completa.
        if self.reservation_schedule:
            return clean_schedule(self.reservation_schedule)
        # Sin «or 10.0»: abrir a medianoche (0.0) es válido; los campos ya traen 10 y 22 por defecto.
        legacy = [[self.reservation_open, self.reservation_close]]
        return {"weekly": {day: [list(r) for r in legacy] for day in WEEKDAYS}, "overrides": [], "rules": dict(NO_RULES)}

    def waiter_save_reservation_schedule(self, schedule):
        """Guarda el horario ya normalizado. El permiso es el de escribir pos.config (administradores)."""
        self.ensure_one()
        self.write({"reservation_schedule": clean_schedule(schedule)})
        return self.reservation_schedule

    def reservation_ranges(self, day):
        """Franjas en que se reciben reservas ese día: la fecha especial si existe; si no, su día de la semana."""
        self.ensure_one()
        schedule = self.waiter_reservation_schedule()
        special = next((o for o in schedule["overrides"] if o["date"] == day.isoformat()), None)
        return special["ranges"] if special else schedule["weekly"][str(day.weekday())]

    def reservation_week_span(self):
        """Primera apertura y último cierre de la semana: el ancho de la línea de tiempo en un día cerrado."""
        self.ensure_one()
        ranges = [r for day in self.waiter_reservation_schedule()["weekly"].values() for r in day]
        return (min(r[0] for r in ranges), max(r[1] for r in ranges)) if ranges else (10.0, 22.0)
