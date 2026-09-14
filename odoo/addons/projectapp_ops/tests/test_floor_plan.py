from copy import deepcopy
from odoo import fields
from odoo.tests import TransactionCase, tagged
from odoo.exceptions import UserError, AccessError


@tagged('post_install', '-at_install')
class TestFloorPlan(TransactionCase):
    def setUp(self):
        super().setUp()
        self.env.user.write({'waiter_role': 'admin'})
        base = self.env['pos.config'].search([], limit=1)
        self.config = base.copy({'name': 'Plano prueba'})
        self.employee = self.env['hr.employee'].create({'name': 'Admin plano', 'company_id': self.env.company.id, 'waiter_role': 'admin'})
        self.token = self.employee._waiter_new_session()
        self.Floor = self.env['restaurant.floor']
        self.plan = {'id': None, 'name': 'Sala prueba', 'revision': 0,
                     'walls': [{'id':'wall', 'x':0,'y':0,'width':800,'height':20}],
                     'zones': [{'id':'zone','name':'Terraza','color':'#3b82f6','x':0,'y':40,'width':800,'height':600}],
                     'tables': [{'id':None,'key':'new','number':1,'seats':6,'zone':'zone','x':80,'y':80,'width':160,'height':120}]}

    def save(self, plan=None):
        p = plan or self.plan
        return self.Floor.waiter_save_plan(self.config.id, p.get('id'), p, self.employee.id, self.token)

    def test_second_pin_login_preserves_existing_editor_session(self):
        self.employee.pin = '123456'
        second = self.env['hr.employee'].waiter_check_pin(self.employee.id, '123456')
        self.assertTrue(second['ok'])
        self.assertEqual(second['token'], self.token)
        self.assertTrue(self.save()['id'])
        self.employee.waiter_session_expires = fields.Datetime.now()
        with self.assertRaises(AccessError):
            self.save()
        renewed = self.env['hr.employee'].waiter_check_pin(self.employee.id, '123456')
        self.assertNotEqual(renewed['token'], self.token)
        self.token = renewed['token']
        self.assertTrue(self.save()['id'])

    def test_atomic_geometry_capacity_zones_and_revision(self):
        saved = self.save()
        self.assertEqual(saved['tables'][0]['seats'], 6)
        self.assertEqual(saved['tables'][0]['zone'], 'zone')
        updated = deepcopy(saved)
        updated['tables'][0]['seats'] = 9
        self.save(updated)
        with self.assertRaises(UserError):
            self.save(saved)
        self.assertEqual(self.Floor.browse(saved['id']).waiter_read_plan()['tables'][0]['seats'], 9)

    def test_overlap_and_wrong_floor_are_rejected_without_partial_writes(self):
        saved = self.save()
        bad = deepcopy(saved)
        bad['name'] = 'No debe guardarse'
        bad['tables'][0]['y'] = 0
        with self.assertRaises(UserError):
            self.save(bad)
        self.assertEqual(self.Floor.browse(saved['id']).name, saved['name'])
        bad = deepcopy(saved)
        bad['tables'][0]['id'] = 99999999
        with self.assertRaises(UserError):
            self.save(bad)

    def test_background_size_is_persisted_and_validated(self):
        self.plan['backgroundSize'] = {'x': 120, 'y': 80, 'width': 2400, 'height': 1600}
        saved = self.save()
        self.assertEqual(saved['backgroundSize'], self.plan['backgroundSize'])
        saved['backgroundSize'] = {'width': -1, 'height': 1600}
        with self.assertRaises(UserError):
            self.save(saved)
        self.assertEqual(self.Floor.browse(saved['id']).waiter_read_plan()['backgroundSize']['width'], 2400)

    def test_invalid_background_does_not_write_the_plan(self):
        saved = self.save()
        saved['background'] = 'not an image'
        saved['name'] = 'No debe guardarse'
        with self.assertRaises(UserError):
            self.save(saved)
        self.assertEqual(self.Floor.browse(saved['id']).name, 'Sala prueba')

    def test_pin_role_and_closed_cash_are_enforced(self):
        with self.assertRaises(AccessError):
            self.Floor.waiter_save_plan(self.config.id, None, self.plan, self.employee.id, 'wrong')
        self.employee.waiter_role = 'waiter'
        with self.assertRaises(AccessError):
            self.save()
        self.employee.waiter_role = 'admin'
        self.env['pos.session'].create({'config_id': self.config.id})
        with self.assertRaises(UserError):
            self.save()

    def test_assignments_are_per_session_and_allow_shared_zones(self):
        saved = self.save()
        waiter = self.env['hr.employee'].create({'name':'Mesero plano','company_id':self.env.company.id})
        session = self.env['pos.session'].create({'config_id':self.config.id})
        session.set_opening_control(0, '')
        members = [waiter.id, self.employee.id]
        session.waiter_assign_zones(saved['id'], {'zone':members}, self.employee.id, self.token)
        self.assertEqual(session.waiter_zone_assignments[str(saved['id'])]['zone'], members)
        order = self.env['pos.order'].create({'session_id': session.id, 'table_id': saved['tables'][0]['id'],
                    'date_order': fields.Datetime.now(), 'amount_tax': 0, 'amount_total': 0, 'amount_paid': 0, 'amount_return': 0})
        self.assertEqual(self.env['pos.order'].waiter_zone_targets(order.ids)[str(order.id)], members)
        order.unlink()
        with self.assertRaises(UserError):
            session.waiter_assign_zones(saved['id'], {'missing':members}, self.employee.id, self.token)
        with self.assertRaises(UserError):
            session.waiter_assign_zones(saved['id'], {'zone':[99999999]}, self.employee.id, self.token)
        session.write({'state':'closed'})
        next_session = self.env['pos.session'].create({'config_id':self.config.id})
        self.assertFalse(next_session.waiter_zone_assignments)
