"""write_brand y la constraint del logo, dentro de Odoo (`-u projectapp_ops --test-enable --test-tags /projectapp_ops`).

La lógica pura también la cubre experience/experience_app/tests/addon/ con un `odoo` falso. Aquí se prueba lo que solo
Odoo puede decir: que el rol admin del POS NO puede usar `write` sobre res.company y SÍ `write_brand`, y que un
mesero no puede ninguna de las dos.
"""
import base64

from odoo.exceptions import AccessError, ValidationError
from odoo.tests import TransactionCase, new_test_user, tagged

PNG_1PX = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="


@tagged("post_install", "-at_install")
class TestWriteBrand(TransactionCase):
    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        # El rol asigna los grupos (users.py): admin ⇒ point_of_sale.group_pos_manager, sin base.group_erp_manager.
        cls.admin = new_test_user(cls.env, login="brand_admin", waiter_role="admin")
        cls.waiter = new_test_user(cls.env, login="brand_waiter", waiter_role="waiter")
        cls.company = cls.env.company

    def test_admin_role_cannot_write_res_company_directly(self):
        """El porqué de write_brand: write exige base.group_erp_manager, que el rol admin no tiene (a propósito)."""
        self.assertFalse(self.admin.has_group("base.group_erp_manager"))
        with self.assertRaises(AccessError):
            self.company.with_user(self.admin).write({"brand_color": "#7A2E2A"})

    def test_admin_role_writes_the_brand_through_write_brand(self):
        Company = self.env["res.company"].with_user(self.admin)
        self.assertTrue(Company.write_brand({"brand_color": " #7a2e2a ", "brand_tagline": "  Cocina de barrio ", "brand_greeting": "   ",
                                             "brand_radius": "24", "brand_logo": PNG_1PX}))
        self.assertEqual((self.company.brand_color, self.company.brand_tagline, self.company.brand_greeting, self.company.brand_radius),
                         ("#7A2E2A", "Cocina de barrio", False, "24"))
        self.assertEqual(self.company.with_context(bin_size=False).brand_logo, PNG_1PX.encode())
        Company.write_brand({"brand_logo": False})
        self.assertFalse(self.company.brand_logo)

    def test_waiter_role_cannot_write_the_brand(self):
        with self.assertRaisesRegex(AccessError, "Solo un administrador"):
            self.env["res.company"].with_user(self.waiter).write_brand({"brand_color": "#7A2E2A"})
        self.assertFalse(self.company.brand_color)

    def test_write_brand_only_accepts_brand_fields(self):
        with self.assertRaises(ValidationError):
            self.env["res.company"].with_user(self.admin).write_brand({"name": "Otro nombre"})

    def test_logo_must_be_a_raster_of_at_most_2_mb(self):
        Company = self.env["res.company"].with_user(self.admin)
        with self.assertRaisesRegex(ValidationError, "PNG"):
            Company.write_brand({"brand_logo": base64.b64encode(b'<svg xmlns="http://www.w3.org/2000/svg"/>').decode()})
        too_big = base64.b64encode(base64.b64decode(PNG_1PX) + b"\0" * 2_000_000).decode()
        with self.assertRaisesRegex(ValidationError, "2 MB"):
            Company.write_brand({"brand_logo": too_big})
