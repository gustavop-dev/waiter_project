"""Régimen tributario del restaurante: INC 8 % por defecto, IVA 19 % en franquicia, o sin impuesto.

Corren con `scripts/odoo-test.sh projectapp_ops TestTaxRegime`, nunca contra el Odoo compartido.
"""
from odoo.exceptions import AccessError, UserError
from odoo.tests import tagged

from .test_kit import KitCase


@tagged('post_install', '-at_install')
class TestTaxRegime(KitCase):
    def setUp(self):
        super().setUp()
        self.env.user.waiter_role = 'admin'
        self.staff = {}
        for role in ('waiter', 'admin'):
            employee = self.env['hr.employee'].create({
                'name': 'Régimen ' + role, 'company_id': self.config.company_id.id, 'waiter_role': role})
            self.staff[role] = (employee.id, employee._waiter_new_session())
        company = self.config.company_id
        for name, amount in [('8% INC prueba', 8.0), ('19% prueba', 19.0)]:
            self.env['account.tax'].create({
                'name': name, 'amount': amount, 'amount_type': 'percent', 'type_tax_use': 'sale',
                'company_id': company.id, 'price_include_override': 'tax_included'})
        self.product.write({'available_in_pos': True, 'taxes_id': [(5,)]})

    def regime(self, role='admin', value=None):
        return self.config.waiter_tax_regime(*self.staff[role], value)

    def test_inc_is_what_a_restaurant_charges(self):
        """El caso normal: un restaurante colombiano cobra INC del 8 %, no IVA (art. 512-9 ET)."""
        self.assertEqual(self.regime(value='inc')['regime'], 'inc')
        taxes = self.product.taxes_id
        self.assertEqual(len(taxes), 1)
        self.assertEqual(taxes.amount, 8.0)
        self.assertIn('INC', taxes.name.upper(), 'el 8 % de un restaurante es el impuesto al consumo')

    def test_franchise_charges_vat_instead(self):
        """Un restaurante en franquicia cobra IVA del 19 % en lugar del INC."""
        self.assertEqual(self.regime(value='iva')['regime'], 'iva')
        self.assertEqual(self.product.taxes_id.amount, 19.0)
        self.assertNotIn('INC', self.product.taxes_id.name.upper())

    def test_not_liable_charges_no_tax_at_all(self):
        """Bajo 3.500 UVT y con un solo establecimiento no se cobra impuesto: el cliente paga la carta."""
        self.regime(value='inc')
        self.assertEqual(self.regime(value='none')['regime'], 'none')
        self.assertFalse(self.product.taxes_id)

    def test_switching_back_and_forth_leaves_one_tax(self):
        """Falla si cambiar de régimen acumula impuestos en vez de reemplazarlos: la carta cobraría dos veces."""
        for value in ('inc', 'iva', 'none', 'inc'):
            self.regime(value=value)
        self.assertEqual(len(self.product.taxes_id), 1)
        self.assertEqual(self.product.taxes_id.amount, 8.0)

    def test_the_tip_never_carries_the_tax(self):
        """La propina no hace parte de la base gravable del INC (art. 512-9): su producto queda fuera."""
        tip = self.env['product.product'].create({'name': 'Propina prueba', 'available_in_pos': True})
        self.config.tip_product_id = tip
        self.regime(value='inc')
        self.assertFalse(tip.product_tmpl_id.taxes_id, 'la propina no puede quedar gravada')

    def test_only_an_admin_changes_it(self):
        """Falla si un mesero puede cambiar lo que cobra la carta."""
        with self.assertRaises(AccessError):
            self.regime('waiter', 'iva')
        self.assertEqual(self.regime('waiter')['regime'], self.regime('admin')['regime'], 'leer sí puede')

    def test_an_unknown_regime_is_rejected(self):
        with self.assertRaises(UserError):
            self.regime(value='retefuente')

    def test_it_reports_a_mixed_menu_instead_of_lying(self):
        """Falla si con la carta a medio cambiar la pantalla afirma un régimen limpio."""
        self.regime(value='inc')
        self.env['product.product'].create({
            'name': 'Plato con IVA', 'available_in_pos': True,
            'taxes_id': [(6, 0, self.env['account.tax'].search([('amount', '=', 19.0), ('type_tax_use', '=', 'sale')], limit=1).ids)]})
        self.assertEqual(self.regime()['regime'], 'mixed')

    def test_gift_cards_and_top_ups_stay_out_of_it(self):
        """Falla si un bono de regalo o una recarga quedan gravados: no son consumo en el establecimiento,
        y cobrarles INC sería inventar un impuesto."""
        bono = self.env['product.product'].create({
            'name': 'Bono de regalo prueba', 'available_in_pos': True, 'type': 'service', 'taxes_id': [(5,)]})
        self.regime(value='inc')
        self.assertFalse(bono.product_tmpl_id.taxes_id, 'un servicio no entra en el régimen de la carta')
        self.assertEqual(self.regime()['regime'], 'inc', 'y tampoco debe hacer parecer la carta mezclada')
