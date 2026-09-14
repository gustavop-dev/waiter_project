from uuid import uuid4
from unittest.mock import patch
from odoo.tests import tagged
from odoo.exceptions import UserError, ValidationError, AccessError
from odoo.tests.common import new_test_user
from .test_kit import KitCase
from .test_menu_settings import TestMenuSettingsGateway


@tagged('post_install', '-at_install')
class TestGatewayPayments(KitCase):
    def setUp(self):
        super().setUp()
        self.session.state='opened'
        self.method=self.config.payment_method_ids.filtered(lambda m:m.type=='bank')[:1]
        self.assertTrue(self.method)
        self.order=self._order('Dine In')
        self.ref='waiter-'+uuid4().hex

    def test_payment_and_retry_are_atomic_and_idempotent(self):
        first=self.order.waiter_gateway_paid(self.method.id,1200000,self.ref)
        self.assertTrue(first['paid'])
        again=self.order.waiter_gateway_paid(self.method.id,1200000,self.ref)
        self.assertEqual(first,again)
        self.assertEqual(len(self.order.payment_ids),1)
        self.assertEqual(self.order.amount_paid,12000)
        with self.assertRaises(ValidationError):
            self.order.waiter_gateway_paid(self.method.id,1200001,self.ref)

    def test_changed_balance_and_cash_method_rejected(self):
        with self.assertRaises(UserError):
            self.order.waiter_gateway_paid(self.method.id,1,self.ref)
        cash=self.config.payment_method_ids.filtered(lambda m:m.type=='cash')[:1]
        if cash:
            with self.assertRaises(UserError):
                self.order.waiter_gateway_paid(cash.id,1200000,self.ref)
        self.assertFalse(self.order.payment_ids)

    def test_new_reference_cannot_pay_an_already_paid_order(self):
        self.order.waiter_gateway_paid(self.method.id,1200000,self.ref)
        with self.assertRaises(UserError):
            self.order.waiter_gateway_paid(self.method.id,1200000,'waiter-'+uuid4().hex)
        self.assertEqual(len(self.order.payment_ids),1)

    def test_cashier_cannot_invent_gateway_settlement(self):
        user=new_test_user(self.env,login='gateway_cashier',groups='base.group_user,point_of_sale.group_pos_user')
        with self.assertRaises(AccessError):
            self.order.with_user(user).waiter_gateway_paid(self.method.id,1200000,self.ref)

    def test_self_service_cannot_fire_until_paid_and_payment_fires_once(self):
        self.order.waiter_requires_payment=True
        with self.assertRaises(UserError):
            self.env['restaurant.order.course'].kitchen_fire(self.order.id,self.order.lines.ids)
        self.assertFalse(self.order.course_ids)
        self.order.waiter_gateway_paid(self.method.id,1200000,self.ref)
        self.assertEqual(len(self.order.course_ids),1)
        self.assertTrue(self.order.course_ids.fired)
        self.order.waiter_gateway_paid(self.method.id,1200000,self.ref)
        self.assertEqual(len(self.order.course_ids),1)

    def test_self_service_cash_payment_also_releases_kitchen_once(self):
        self.order.waiter_requires_payment=True
        cash=self.config.payment_method_ids.filtered(lambda m:m.type=='cash')[:1]
        self.assertTrue(cash)
        self.order.add_payment({'pos_order_id':self.order.id,'payment_method_id':cash.id,'amount':12000})
        self.assertFalse(self.order.course_ids)
        self.order.action_pos_order_paid()
        self.assertEqual(len(self.order.course_ids),1)
        self.assertTrue(self.order.course_ids.fired)

    def test_failed_gateway_settlement_never_releases_self_service(self):
        self.order.waiter_requires_payment=True
        with self.assertRaises(UserError):
            self.order.waiter_gateway_paid(self.method.id,1,self.ref)
        self.assertFalse(self.order.course_ids)
        self.assertFalse(self.order.payment_ids)

    def _policy_employee(self, role):
        employee = self.env['hr.employee'].create({'name': 'Política ' + role, 'company_id': self.env.company.id, 'waiter_role': role})
        return employee, employee._waiter_new_session()

    def test_staff_exception_requires_valid_session_and_allowed_role(self):
        self.env.user.waiter_role = 'admin'
        admin, admin_token = self._policy_employee('admin')
        waiter, token = self._policy_employee('waiter')
        self.config.waiter_kitchen_policy(admin.id, admin_token, ['waiter'])
        self.order.waiter_requires_payment = True
        course = self.env['restaurant.order.course']
        with self.assertRaises(UserError):
            course.kitchen_fire(self.order.id, self.order.lines.ids, waiter.id, token)
        with self.assertRaises(AccessError):
            course.kitchen_fire(self.order.id, self.order.lines.ids, admin.id, 'invented')
        with self.assertRaises(UserError):
            course.kitchen_fire(self.order.id, self.order.lines.ids)
        self.config.waiter_kitchen_policy(admin.id, admin_token, [])
        result = course.kitchen_fire(self.order.id, self.order.lines.ids, waiter.id, token)
        self.assertTrue(result)
        self.assertEqual(self.order.state, 'draft')
        self.assertFalse(self.order.payment_ids)

    def test_only_employee_admin_can_change_policy(self):
        self.env.user.waiter_role = 'admin'
        employee, token = self._policy_employee('waiter')
        with self.assertRaises(AccessError):
            self.config.waiter_kitchen_policy(employee.id, token, [])
        with self.assertRaises(AccessError):
            self.config.write({'waiter_kitchen_prepay_roles': []})
        with self.assertRaises(AccessError):
            self.config.with_context(_policy_write=True).write({'waiter_kitchen_prepay_roles': []})

    def test_staff_prepay_applies_to_pos_orders_and_payment_releases_them(self):
        self.env.user.waiter_role = 'admin'
        admin, admin_token = self._policy_employee('admin')
        waiter, token = self._policy_employee('waiter')
        self.config.waiter_kitchen_policy(admin.id, admin_token, ['waiter'])
        with self.assertRaises(UserError):
            self.env['restaurant.order.course'].kitchen_fire(self.order.id, self.order.lines.ids, waiter.id, token)
        with self.assertRaises(UserError):
            self.env['restaurant.order.course'].kitchen_fire(self.order.id, self.order.lines.ids)
        self.order.waiter_gateway_paid(self.method.id, 1200000, self.ref)
        self.assertTrue(self.order.course_ids.fired)


@tagged('post_install', '-at_install')
class TestPaymentSettingsGateway(TestMenuSettingsGateway):
    def test_gateway_manager_only_and_tenant_is_not_browser_input(self):
        import json
        def rpc(body):
            return self.url_open('/waiter/admin/payment_gateways',data=json.dumps({'jsonrpc':'2.0','method':'call','params':body}),headers={'Content-Type':'application/json'}).json()
        self.authenticate('mesero_plantillas','Waiter-2026-mesero')
        self.assertIn('error',rpc({'action':'get'}))
        self.authenticate('admin_plantillas','Waiter-2026-admin')
        with patch('odoo.addons.projectapp_ops.controllers.admin._call',return_value={'provider':'wompi'}) as call:
            self.assertEqual(rpc({'action':'get'})['result']['provider'],'wompi')
            self.assertIn('/burger-house/poblado/pasarelas/',call.call_args.args[1])
            self.assertIn('error',rpc({'action':'get','restaurant':'foreign'}))
            self.assertEqual(call.call_count,1)
