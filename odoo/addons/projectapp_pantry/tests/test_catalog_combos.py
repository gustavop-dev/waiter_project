import json
from odoo import Command
from odoo.exceptions import UserError, AccessError
from odoo.tests import tagged
from .test_restaurant_inventory import TestRestaurantInventory

@tagged('post_install','-at_install')
class TestCatalogCombos(TestRestaurantInventory):
    def combo(self):
        self.dish.available_in_pos=True
        second=self.T.browse(self.T.waiter_create_dish({'name':'Segundo plato combo'},[{'product_tmpl_id':self.meat.id,'qty':100,'uom_id':self.gram.id}])['id'])
        second.available_in_pos=True
        items=[{'producto':self.dish.product_variant_id.id,'cantidad':1},{'producto':second.product_variant_id.id,'cantidad':2}]
        cid=self.T.waiter_save_catalog_product(None,{'name':'Combo prueba','type':'consu','sale_ok':True,'available_in_pos':True,'list_price':15000,'diner_attributes':json.dumps({'combo':items})},self.employee.id,self.token)
        return self.T.browse(cid),items

    def test_combo_price_components_stock_and_kitchen_snapshot(self):
        combo,items=self.combo()
        self.assertEqual(combo.list_price,15000)
        self.assertEqual(len(combo.waiter_combo_bom_id.bom_line_ids),2)
        self.assertAlmostEqual(combo._pantry_requirements()[combo.id][self.meat.product_variant_id.id],.4)
        self.assertEqual(combo.servings_available,5)
        self.assertTrue(combo.waiter_combo_availability()[str(combo.product_variant_id.id)])
        self.dish.available_in_pos=False
        self.assertFalse(combo.waiter_combo_availability()[str(combo.product_variant_id.id)])
        self.dish.available_in_pos=True
        config=self.env['pos.config'].search([],limit=1).copy({'name':'Caja combo'})
        session=self.env['pos.session'].create({'config_id':config.id})
        order=self.env['pos.order'].create({'session_id':session.id,'amount_tax':0,'amount_total':0,'amount_paid':0,'amount_return':0,
            'lines':[Command.create({'product_id':combo.product_variant_id.id,'qty':2,'price_unit':0,'price_subtotal':0,'price_subtotal_incl':0,'customer_note':'Sin salsa'})]})
        self.assertIn('Incluye por combo:',order.lines.customer_note)
        order.lines.write({'customer_note':'Alergia: leche'})
        self.assertIn('Incluye por combo:',order.lines.customer_note)
        with self.assertRaises(UserError):combo.write({'diner_attributes':'{}'})
        self.T._waiter_invalidate()
        self.assertEqual(combo.servings_available,3)
        order.action_pos_order_paid()
        self.T._waiter_invalidate()
        self.assertTrue(order.picking_ids)
        self.assertAlmostEqual(self.meat.qty_available,1.2)
        self.assertEqual(combo.servings_available,3)

    def test_invalid_combo_or_session_cannot_save(self):
        with self.assertRaises(AccessError):self.T.waiter_save_catalog_product(None,{},self.employee.id,'wrong')
        combo,items=self.combo()
        for invalid in [[items[0]], [items[0],items[0]], [items[0],{'producto':combo.product_variant_id.id,'cantidad':1}]]:
            with self.assertRaises(UserError),self.env.cr.savepoint():combo.write({'diner_attributes':json.dumps({'combo':invalid})})
