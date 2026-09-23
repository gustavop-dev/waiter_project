from unittest.mock import patch

from odoo.exceptions import AccessError, UserError
from odoo.tests import tagged
from odoo.tests.common import new_test_user

from .test_kit import KitCase


@tagged('post_install', '-at_install')
class TestBilling(KitCase):
    def setUp(self):
        super().setUp()
        self.session.state = 'opened'
        self.partner = self.env['res.partner'].create({'name': 'Cliente contable de prueba'})
        self.product.taxes_id = False
        self.product.property_account_income_id = self.env['account.account'].search([
            ('account_type', '=', 'income'), ('company_ids', 'in', self.env.company.ids)], limit=1)
        self.order = self._order()
        self.order.lines.tax_ids = False
        self.order.add_payment({'pos_order_id': self.order.id,
                               'payment_method_id': self.config.payment_method_ids[:1].id, 'amount': 12000})
        self.order.state = 'paid'

    def test_post_and_retry_use_one_invoice_and_preserve_customer(self):
        self.assertTrue(self.order.waiter_billing_review(self.partner.id)['ready'])
        move_id = self.order.waiter_account_invoice(self.partner.id)
        move = self.env['account.move'].browse(move_id)
        self.assertEqual(move.state, 'posted')
        self.assertEqual(move.amount_total, 12000)
        self.assertEqual(move.pos_order_ids, self.order)
        detail = move.waiter_accounting_detail()
        self.assertTrue(detail['ready'])
        self.assertEqual(detail['debit'], detail['credit'])
        self.assertEqual(self.order.waiter_account_invoice(self.env.company.partner_id.id), move_id)
        self.assertEqual(self.order.partner_id, self.partner)

    def test_failed_post_does_not_leave_customer_assigned(self):
        with patch.object(type(self.order), 'action_pos_order_invoice', side_effect=UserError('Prueba')):
            with self.assertRaises(UserError):
                self.order.waiter_account_invoice(self.partner.id)
        self.assertFalse(self.order.partner_id)
        self.assertFalse(self.order.account_move)

    def test_totals_and_tips_block_before_posting(self):
        self.order.amount_total = 13000
        self.assertFalse(self.order.waiter_billing_review(self.partner.id)['ready'])
        with self.assertRaises(UserError):
            self.order.waiter_account_invoice(self.partner.id)
        self.assertFalse(self.order.account_move)
        self.order.amount_total = 12000
        self.config.tip_product_id = self.product
        review = self.order.waiter_billing_review(self.partner.id)
        self.assertEqual(review['tip'], 12000)
        self.assertTrue(any('pasivo' in issue for issue in review['issues']))

    def test_cashier_cannot_use_admin_accounting_actions(self):
        user = new_test_user(self.env, login='billing_cashier', groups='base.group_user,point_of_sale.group_pos_user')
        with self.assertRaises(AccessError):
            self.order.with_user(user).waiter_account_invoice(self.partner.id)

    def test_draft_is_never_reported_as_verified(self):
        move = self.env['account.move'].create({'move_type': 'out_invoice', 'partner_id': self.partner.id})
        self.assertFalse(move.waiter_accounting_detail()['ready'])

    def test_tip_account_must_be_liability_and_posts_to_personnel(self):
        self.config.tip_product_id = self.product
        with self.assertRaises(UserError):
            self.config.waiter_set_tip_account(self.product.property_account_income_id.id)
        liability = self.env['account.account'].search([
            ('account_type', '=', 'liability_current'), ('company_ids', 'in', self.env.company.ids)], limit=1)
        self.assertTrue(liability)
        self.config.waiter_set_tip_account(liability.id)
        self.assertTrue(self.order.waiter_billing_review(self.partner.id)['ready'])
        move_id = self.order.waiter_account_invoice(self.partner.id)
        move = self.env['account.move'].browse(move_id)
        self.assertEqual(move.invoice_line_ids.account_id, liability)
        self.assertEqual(move.waiter_accounting_detail()['tip'], 12000)

    def test_refund_keeps_original_document_reference(self):
        move_id = self.order.waiter_account_invoice(self.partner.id)
        refund = self._order(amount_total=-12000, amount_paid=0)
        refund.lines.write({'qty': -1, 'price_subtotal': -12000, 'price_subtotal_incl': -12000,
                            'tax_ids': [(5, 0, 0)], 'refunded_orderline_id': self.order.lines.id})
        refund.add_payment({'pos_order_id': refund.id,
                            'payment_method_id': self.config.payment_method_ids[:1].id, 'amount': -12000})
        refund.state = 'paid'
        refund_id = refund.waiter_account_invoice(self.partner.id)
        move = self.env['account.move'].browse(refund_id)
        self.assertEqual(move.move_type, 'out_refund')
        self.assertIn(self.env['account.move'].browse(move_id).name, move.waiter_accounting_detail()['original'])

    def test_general_sale_uses_one_generic_partner_and_keeps_each_sale(self):
        count = self.env['res.partner'].search_count([('company_id', '=', self.env.company.id), ('vat', '=', '222222222222')])
        self.assertTrue(self.order.waiter_billing_review(False, True)['ready'])
        self.assertEqual(self.env['res.partner'].search_count([('company_id', '=', self.env.company.id), ('vat', '=', '222222222222')]), count)
        first = self.order.waiter_account_invoice(False, True)
        partner = self.order.partner_id
        self.assertEqual(partner.vat, '222222222222')
        self.assertEqual(partner.name, 'Consumidor final')
        self.assertFalse(partner.email)
        self.assertEqual(partner.company_id, self.order.company_id)
        other = self._order()
        other.lines.tax_ids = False
        other.add_payment({'pos_order_id': other.id, 'payment_method_id': self.config.payment_method_ids[:1].id, 'amount': 12000})
        other.action_pos_order_paid()
        self.assertFalse(other.partner_id, 'Cobrar no exige pasar por el módulo contable.')
        second = other.waiter_account_invoice(False, True)
        self.assertNotEqual(first, second)
        self.assertEqual(other.partner_id, partner)
        self.assertEqual(other.waiter_account_invoice(self.partner.id), second)
        self.assertEqual(other.partner_id, partner, 'Reintentar no cambia el comprador de un documento creado.')
