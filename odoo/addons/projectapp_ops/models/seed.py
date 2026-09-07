"""Siembra idempotente de lo que el kit CloudPos da por hecho y Community no trae configurado.

Se ejecuta en el `post_init_hook` de `projectapp_ops` (instalación) y a mano con
`odoo/provisioning/seed-kit.sh` (un Odoo ya instalado: `-u` no vuelve a correr el hook). Cada paso busca
antes de crear, así que repetirla no duplica nada.

- Presets Dine In (`service_at` table), Takeout (counter, identificación por nombre) y Delivery (delivery,
  identificación por dirección), activos en el `pos.config` demo.
- Programa de fidelización «Puntos Waiter»: 1 punto por cada 1.000 COP; 100 puntos = 1.000 COP de descuento.
- Empleados demo «Sofía Mesera» (PIN 123456, mesera) y «Carlos Cajero» (PIN 654321, cajero) ligados al
  `pos.config` demo (`module_pos_hr` encendido para que viajen en `load_data`).
"""
from odoo import api, fields, models

PRESETS = [
    # (nombre, service_at, identification)
    ("Dine In", "table", "none"),
    ("Takeout", "counter", "name"),
    ("Delivery", "delivery", "address"),
]
LOYALTY_NAME = "Puntos Waiter"
COP_PER_POINT = 1000.0          # 1 punto por cada 1.000 COP
REDEEM_POINTS = 100.0           # 100 puntos…
REDEEM_COP = 1000.0             # …valen 1.000 COP
DEMO_EMPLOYEES = [
    # (nombre, PIN, rol, correo, vinculación)
    ("Sofía Mesera", "123456", "waiter", "sofia.mesera@example.com", "full_time"),
    ("Carlos Cajero", "654321", "cashier", "carlos.cajero@example.com", "full_time"),
]


class WaiterSeed(models.AbstractModel):
    _name = "waiter.seed"
    _description = "Siembra del kit CloudPos (presets, fidelización, empleados demo)"

    @api.model
    def _demo_config(self):
        config = self.env["pos.config"].search([("module_pos_restaurant", "=", True)], order="id", limit=1)
        return config or self.env["pos.config"].search([], order="id", limit=1)

    @api.model
    def seed_presets(self):
        preset_model = self.env["pos.preset"]
        presets = preset_model.browse()
        for name, service_at, identification in PRESETS:
            preset = preset_model.search([("name", "=", name)], limit=1)
            if not preset:
                preset = preset_model.create({"name": name, "service_at": service_at, "identification": identification})
            elif preset.service_at != service_at or preset.identification != identification:
                preset.write({"service_at": service_at, "identification": identification})
            presets |= preset
        config = self._demo_config()
        if config:
            values = {"use_presets": True, "available_preset_ids": [(4, p.id) for p in presets]}
            if not config.default_preset_id:
                values["default_preset_id"] = presets[0].id
            config.write(values)
        return presets

    @api.model
    def _loyalty_configured(self, program):
        rule, reward = program.rule_ids, program.reward_ids
        return (len(rule) == 1 and rule.reward_point_mode == "money" and abs(rule.reward_point_amount - 1.0 / COP_PER_POINT) < 1e-9
                and len(reward) == 1 and reward.discount_mode == "per_point" and reward.required_points == REDEEM_POINTS
                and reward.discount == REDEEM_COP / REDEEM_POINTS)

    @api.model
    def seed_loyalty(self):
        program_model = self.env["loyalty.program"]
        program = program_model.search([("name", "=", LOYALTY_NAME)], limit=1)
        if program and self._loyalty_configured(program):
            return program
        # Dos pasos: `_compute_from_program_type` reescribe reglas y recompensas al fijar el tipo, así que primero
        # el tipo y después las nuestras (reemplazando las que Odoo puso por defecto).
        if not program:
            program = program_model.create({"name": LOYALTY_NAME, "program_type": "loyalty", "pos_ok": True})
        program.write({
            "applies_on": "both", "trigger": "auto", "portal_visible": True, "portal_point_name": "Puntos",
            "rule_ids": [(5, 0, 0), (0, 0, {"reward_point_mode": "money", "reward_point_amount": 1.0 / COP_PER_POINT,
                                            "minimum_amount": COP_PER_POINT, "minimum_amount_tax_mode": "incl"})],
            "reward_ids": [(5, 0, 0), (0, 0, {"reward_type": "discount", "discount_mode": "per_point",
                                              "discount": REDEEM_COP / REDEEM_POINTS, "required_points": REDEEM_POINTS,
                                              "discount_applicability": "order",
                                              "description": "1.000 COP de descuento por cada 100 puntos"})],
        })
        return program

    @api.model
    def seed_employees(self):
        employee_model = self.env["hr.employee"]
        employees = employee_model.browse()
        for name, pin, role, email, status in DEMO_EMPLOYEES:
            employee = employee_model.search([("name", "=", name)], limit=1)
            if not employee:
                employee = employee_model.create({
                    "name": name, "pin": pin, "waiter_role": role, "work_email": email, "employment_status": status,
                    "joining_date": fields.Date.today(), "shift_start": 8.0, "shift_end": 16.0,
                })
            employees |= employee
        # Todo empleado ligado a un usuario del POS entra al terminal. Sin esto, `pos.config` no viaja en
        # `load_data` (pos_hr lo filtra), `pos_loyalty` revienta al leer `data['pos.config'][0]` y la persona
        # se queda mirando una pantalla en blanco.
        linked = employee_model.search([
            ("user_id", "!=", False), ("user_id.active", "=", True),
            ("user_id.group_ids", "in", self.env.ref("point_of_sale.group_pos_user").id),
        ])
        config = self._demo_config()
        if config:
            config.write({"module_pos_hr": True, "basic_employee_ids": [(4, e.id) for e in employees | linked]})
        return employees

    @api.model
    def seed_kit(self):
        """Todo lo anterior, en orden. Devuelve un resumen para el log de provisioning."""
        presets = self.seed_presets()
        program = self.seed_loyalty()
        employees = self.seed_employees()
        return {"presets": presets.mapped("name"), "loyalty": program.name, "employees": employees.mapped("name")}
