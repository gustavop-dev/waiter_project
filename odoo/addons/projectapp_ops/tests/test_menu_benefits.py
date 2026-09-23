import uuid
from datetime import timedelta

from odoo import fields
from odoo.exceptions import AccessError, UserError, ValidationError
from odoo.tests import tagged
from odoo.tests.common import new_test_user
from .test_kit import KitCase
from odoo.addons.point_of_sale.tests.common import CommonPosTest


@tagged('post_install', '-at_install', 'menu_benefits')
class TestMenuBenefits(CommonPosTest):
    _order = KitCase._order

    def setUp(self):
        super().setUp()
        self.config = self.pos_config_usd
        self.session = self.env['pos.session'].create({'config_id': self.config.id})
        self.session.action_pos_session_open()
        self.env['waiter.seed'].seed_loyalty()
        self.product = self.env['product.product'].create({'name': 'Plato de prueba', 'available_in_pos': True, 'list_price': 12000, 'taxes_id': [(6, 0, [])]})

    def _member(self):
        identity = {'id': str(uuid.uuid4()), 'name': 'Comensal de prueba', 'email': 'benefits@example.invalid'}
        data = self.config.waiter_diner_benefits(identity)
        return identity, self.env['loyalty.card'].browse(data['tarjeta'])

    def _coupon(self, **overrides):
        coupon = {'name': 'Descuento prueba', 'code': 'TEST' + uuid.uuid4().hex[:12].upper(), 'percent': 20, 'minimum': 10000, 'active': True}
        coupon.update(overrides)
        data = self.config.waiter_benefits_settings(coupon=coupon)
        return next(c for c in data['coupons'] if c['code'] == coupon['code'])

    def _pay(self, order):
        method = self.config.payment_method_ids.filtered(lambda m: m.type == 'cash')[:1] or self.config.payment_method_ids[:1]
        order.add_payment({'pos_order_id': order.id, 'payment_method_id': method.id, 'amount': order.amount_total})
        order.action_pos_order_paid()

    def test_coupon_uses_pos_program_and_validates_minimum_and_dates(self):
        c = self._coupon()
        self.assertEqual(self.config.waiter_coupon_quote(c['code'].lower(), 12000)['monto'], 2400)
        with self.assertRaises(UserError):
            self.config.waiter_coupon_quote(c['code'], 9999)
        c.update(end=str(fields.Date.today() - timedelta(days=1)))
        self.config.waiter_benefits_settings(coupon=c)
        with self.assertRaises(UserError):
            self.config.waiter_coupon_quote(c['code'], 12000)
        with self.assertRaises(ValidationError):
            self.config.waiter_benefits_settings(coupon={**c, 'percent': 101})

    def test_cashier_cannot_change_programs_or_provision_diner_identity(self):
        user = new_test_user(self.env, login='benefits-cashier', groups='point_of_sale.group_pos_user')
        with self.assertRaises(AccessError):
            self.config.with_user(user).waiter_benefits_settings()
        with self.assertRaises(AccessError):
            self.config.with_user(user).waiter_diner_benefits({'id': str(uuid.uuid4())})

    def test_points_are_paid_only_and_idempotent_and_visible_on_same_card(self):
        identity, card = self._member()
        order = self._order(uuid=str(uuid.uuid4()))
        order.lines.waiter_loyalty_card_id = card
        self.assertEqual(card.points, 0)
        self._pay(order)
        self.assertAlmostEqual(card.points, 12)
        order._waiter_settle_points()
        order.write({'state': 'paid'})
        self.assertAlmostEqual(card.points, 12)
        data = self.config.waiter_diner_benefits(identity, order.uuid)
        self.assertEqual((data['tarjeta'], data['puntos'], data['ganados']), (card.id, 12, 12))
        self.assertEqual(len(card.history_ids), 1)

    def test_shared_table_only_rewards_owned_lines_and_refund_reverses_points(self):
        _, card = self._member()
        _, other = self._member()
        order = self._order()
        order.lines.waiter_loyalty_card_id = card
        order.lines.copy({'order_id': order.id, 'waiter_loyalty_card_id': other.id})
        order.recompute_prices()
        self._pay(order)
        self.assertAlmostEqual(card.points, 12)
        self.assertAlmostEqual(other.points, 12)
        original = order.lines.filtered(lambda l: l.waiter_loyalty_card_id == card)
        refund = self._order()
        refund.lines.write({'qty': -1, 'price_subtotal': -12000, 'price_subtotal_incl': -12000, 'refunded_orderline_id': original.id})
        refund.recompute_prices()
        self._pay(refund)
        self.assertAlmostEqual(card.points, 0)
        self.assertAlmostEqual(other.points, 12)
        refund._waiter_settle_points()
        self.assertAlmostEqual(card.points, 0)

    def test_coordinates_require_valid_pair_including_zero(self):
        self.env.company.write({'waiter_latitude': '0', 'waiter_longitude': '0'})
        with self.assertRaises(ValidationError):
            self.env.company.write({'waiter_latitude': '91'})

    def test_redemption_is_reserved_atomically_and_charged_once_at_payment(self):
        _, card = self._member()
        card.points = 200
        order = self._order()
        result = order.waiter_redeem_points(card.id)
        self.assertEqual(result, {'amount': 2000, 'points': 200})
        self.assertEqual(card.points, 200, 'Draft only reserves points')
        self.assertEqual(order.waiter_redeem_points(card.id), result)
        card.program_id.reward_ids.discount = 20
        order.recompute_prices()
        self.assertEqual(order.amount_total, 10000, 'Changing point value cannot change an existing reservation')
        another = self._order()
        with self.assertRaises(UserError):
            another.waiter_redeem_points(card.id)
        self._pay(order)
        self.assertEqual(card.points, 10, 'Earn on net paid consumption')
        order._waiter_settle_points()
        self.assertEqual(card.points, 10)
        self.assertEqual((card.history_ids.issued, card.history_ids.used), (10, 200))

    def test_cancelled_draft_releases_redemption_and_minimum_is_enforced(self):
        _, card = self._member()
        order = self._order()
        card.points = 99
        with self.assertRaises(UserError):
            order.waiter_redeem_points(card.id)
        card.points = 200
        order.waiter_redeem_points(card.id)
        order.write({'state': 'cancel'})
        another = self._order()
        self.assertEqual(another.waiter_redeem_points(card.id)['points'], 200)

    def test_admin_points_rate_applies_to_paid_orders(self):
        self.config.waiter_benefits_settings(loyalty={'spendPerPoint': 200, 'valuePerPoint': 10, 'minimumPoints': 50})
        _, card = self._member()
        self.assertEqual(card.program_id.rule_ids.minimum_amount, 200)
        self.product.list_price = 500
        order = self._order()
        order.lines.waiter_loyalty_card_id = card
        order.recompute_prices()
        self._pay(order)
        self.assertEqual(card.points, 2.5)
