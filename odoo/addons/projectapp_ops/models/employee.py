"""Empleado del kit CloudPos sobre `hr.employee` (pos_hr + hr_attendance), sin vistas.

Los meseros no tienen usuario de Odoo (Plan I, «Identidad y sesión»): el terminal abre una sesión con su
propio usuario y cada empleado se identifica con un PIN de 6 dígitos (`hr.employee.pin`, de `hr`).
El PIN se compara siempre en el servidor (`waiter_check_pin`), nunca por hash en el cliente como hace el
POS de Odoo; cinco fallos seguidos bloquean el PIN diez minutos. Validar el PIN abre la asistencia del
día (`hr.attendance`) y «Log Out» la cierra (`waiter_end_shift`).
"""
import secrets
from datetime import timedelta

from odoo import _, api, fields, models
from odoo.exceptions import AccessError, UserError

ROLES = [("waiter", "Mesero"), ("cashier", "Cajero"), ("admin", "Administrador")]
EMPLOYMENT = [("full_time", "Tiempo completo"), ("part_time", "Medio tiempo"), ("contract", "Contrato")]
PIN_MAX_ATTEMPTS = 5
PIN_LOCK_MINUTES = 10
PIN_RESET_SECONDS = 60      # mínimo entre correos de «olvidé mi PIN» por empleado
WAITER_EMPLOYEE_FIELDS = ["waiter_role", "employee_code", "joining_date", "shift_start", "shift_end", "employment_status"]


class HrEmployee(models.Model):
    _inherit = "hr.employee"

    waiter_role = fields.Selection(ROLES, string="Rol en Waiter", default="waiter", required=True)
    employee_code = fields.Char(string="Código de empleado", copy=False, readonly=True, index=True,
                                help="Secuencia WT-0001, WT-0002… (kit: Employee ID). Se asigna al crear.")
    joining_date = fields.Date(string="Fecha de ingreso")
    shift_start = fields.Float(string="Inicio del turno (h)", help="Hora decimal, p. ej. 8.5 = 08:30. Vacío: sin turno fijo.")
    shift_end = fields.Float(string="Fin del turno (h)")
    employment_status = fields.Selection(EMPLOYMENT, string="Tipo de vinculación")
    waiter_pin_attempts = fields.Integer(string="Intentos fallidos del PIN", default=0, copy=False)
    waiter_pin_locked_until = fields.Datetime(string="PIN bloqueado hasta", copy=False)
    waiter_pin_reset_at = fields.Datetime(string="Último envío de PIN nuevo", copy=False)

    @api.model
    def _load_pos_data_fields(self, *args, **kwargs):
        return super()._load_pos_data_fields(*args, **kwargs) + WAITER_EMPLOYEE_FIELDS

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if not vals.get("employee_code"):
                vals["employee_code"] = self.env["ir.sequence"].sudo().next_by_code("waiter.employee.code")
        return super().create(vals_list)

    # --- Helpers ----------------------------------------------------------------------------------

    @staticmethod
    def _waiter_valid_pin(pin):
        return isinstance(pin, str) and len(pin) == 6 and pin.isascii() and pin.isdigit()

    def _waiter_employee_dict(self):
        """Lo que el POS guarda en `authStore.employee` tras validar el PIN."""
        self.ensure_one()
        return {
            "id": self.id, "name": self.name, "waiter_role": self.waiter_role, "employee_code": self.employee_code,
            "joining_date": fields.Date.to_string(self.joining_date) if self.joining_date else False,
            "shift_start": self.shift_start, "shift_end": self.shift_end, "employment_status": self.employment_status,
            "work_email": self.work_email or False, "job_title": self.job_title or False,
            "user_id": self.user_id.id or False,
        }

    def _waiter_open_attendance(self):
        return self.env["hr.attendance"].sudo().search(
            [("employee_id", "=", self.id), ("check_out", "=", False)], order="check_in desc", limit=1)

    def _waiter_require_pos_user(self):
        if not self.env.user.has_group("point_of_sale.group_pos_user"):
            raise AccessError(_("Solo un usuario del punto de venta puede operar con el PIN de los empleados."))

    # --- API que consume el POS (RPC sobre hr.employee) -------------------------------------------

    @api.model
    def waiter_check_pin(self, employee_id, pin):
        """Valida el PIN en el servidor y abre la asistencia del día.

        Devuelve `{ok: True, employee: {...}, attendance_id}` o `{ok: False, reason: 'wrong'|'locked'|'unknown',
        attempts_left, locked_until}`. Tras PIN_MAX_ATTEMPTS fallos el PIN queda bloqueado PIN_LOCK_MINUTES.
        """
        self._waiter_require_pos_user()
        employee = self.sudo().browse(int(employee_id)).exists()
        if not employee or not employee.active:
            return {"ok": False, "reason": "unknown"}
        now = fields.Datetime.now()
        if employee.waiter_pin_locked_until and employee.waiter_pin_locked_until > now:
            return {"ok": False, "reason": "locked", "locked_until": fields.Datetime.to_string(employee.waiter_pin_locked_until)}
        pin = str(pin or "")
        if employee.pin and secrets.compare_digest(employee.pin, pin):
            employee.write({"waiter_pin_attempts": 0, "waiter_pin_locked_until": False})
            attendance = employee._waiter_open_attendance()
            if not attendance:
                attendance = self.env["hr.attendance"].sudo().create({"employee_id": employee.id, "check_in": now})
            return {"ok": True, "employee": employee._waiter_employee_dict(), "attendance_id": attendance.id}
        attempts = employee.waiter_pin_attempts + 1
        values = {"waiter_pin_attempts": attempts}
        result = {"ok": False, "reason": "wrong", "attempts_left": PIN_MAX_ATTEMPTS - attempts}
        if attempts >= PIN_MAX_ATTEMPTS:
            locked_until = now + timedelta(minutes=PIN_LOCK_MINUTES)
            values.update({"waiter_pin_attempts": 0, "waiter_pin_locked_until": locked_until})
            result = {"ok": False, "reason": "locked", "locked_until": fields.Datetime.to_string(locked_until)}
        employee.write(values)
        return result

    @api.model
    def waiter_change_pin(self, employee_id, new_pin):
        """Cambia el PIN: exactamente 6 dígitos ASCII. Devuelve True."""
        self._waiter_require_pos_user()
        if not self._waiter_valid_pin(str(new_pin) if isinstance(new_pin, int) else new_pin):
            raise UserError(_("El PIN debe tener exactamente 6 dígitos."))
        employee = self.sudo().browse(int(employee_id)).exists()
        if not employee:
            raise UserError(_("El empleado no existe."))
        employee.write({"pin": str(new_pin), "waiter_pin_attempts": 0, "waiter_pin_locked_until": False})
        return True

    @api.model
    def waiter_forgot_pin(self, email):
        """Genera un PIN nuevo y lo envía al correo de trabajo del empleado. Siempre devuelve True: nunca
        revela si el correo existe. Un envío por minuto por empleado."""
        self._waiter_require_pos_user()
        email = (email or "").strip().lower()
        if not email:
            return True
        employee = self.sudo().search([("work_email", "=ilike", email), ("active", "=", True)], limit=1)
        now = fields.Datetime.now()
        if not employee or (employee.waiter_pin_reset_at and (now - employee.waiter_pin_reset_at).total_seconds() < PIN_RESET_SECONDS):
            return True
        pin = f"{secrets.randbelow(1_000_000):06d}"
        employee.write({"pin": pin, "waiter_pin_attempts": 0, "waiter_pin_locked_until": False, "waiter_pin_reset_at": now})
        sender = self.env["ir.config_parameter"].sudo().get_param("mail.default.from") or "team@projectapp.co"
        body = (
            f"<p>Hola {employee.name},</p>"
            f"<p>Tu PIN nuevo para entrar a <strong>Waiter</strong> es:</p>"
            f"<p style='font-size:28px;font-family:monospace;letter-spacing:0.2em'><strong>{pin}</strong></p>"
            f"<p>Escríbelo en la pantalla de empleados y cámbialo desde tu cuenta cuando quieras.</p>"
            f"<p>— Equipo ProjectApp</p>"
        )
        self.env["mail.mail"].sudo().create({
            "subject": "Tu PIN nuevo de Waiter", "email_from": sender, "email_to": employee.work_email,
            "body_html": body, "auto_delete": True,
        }).send(raise_exception=False)
        return True

    @api.model
    def waiter_end_shift(self, employee_id):
        """Cierra la asistencia abierta (check-out). Devuelve `{ok, attendance_id, worked_hours}`;
        `ok: False` si no había asistencia abierta."""
        self._waiter_require_pos_user()
        employee = self.sudo().browse(int(employee_id)).exists()
        attendance = employee._waiter_open_attendance() if employee else None
        if not attendance:
            return {"ok": False, "attendance_id": False, "worked_hours": 0.0}
        attendance.write({"check_out": fields.Datetime.now()})
        return {"ok": True, "attendance_id": attendance.id, "worked_hours": attendance.worked_hours}
