from odoo.tests import TransactionCase, tagged
from odoo.exceptions import AccessError, ValidationError

@tagged('post_install','-at_install')
class TestMenuBanners(TransactionCase):
    def setUp(self):
        super().setUp()
        self.env.user.waiter_role='admin'
        self.config=self.env['pos.config'].search([],limit=1)
        self.employee=self.env['hr.employee'].create({'name':'Admin banners','waiter_role':'admin','company_id':self.env.company.id})
        self.token=self.employee._waiter_new_session()
        self.banner={'layout':'notice','title':'Hoy abrimos','subtitle':'Hasta las diez','button':'','target':'none','targetId':None,'image':'','theme':'amber','active':True}

    def test_admin_session_required_and_roundtrip_order(self):
        with self.assertRaises(AccessError):self.config.waiter_banner_settings(self.employee.id,'bad',[self.banner])
        with self.assertRaises(AccessError):self.config.write({'waiter_menu_banners':[self.banner]})
        saved=self.config.waiter_banner_settings(self.employee.id,self.token,[self.banner,{**self.banner,'title':'Segundo'}])
        self.assertTrue(saved['configured'])
        self.assertEqual([b['title'] for b in saved['banners']],['Hoy abrimos','Segundo'])
        self.assertEqual(self.config.waiter_banner_settings(self.employee.id,self.token,[])['banners'],[])

    def test_invalid_destination_image_and_limit(self):
        for banners in [[{**self.banner,'target':'product','targetId':999999999}],[{**self.banner,'layout':'image'}],[{**self.banner,'image':'data:image/svg+xml;base64,PHN2Zy8+'}],[self.banner]*9]:
            with self.assertRaises(ValidationError):self.config.waiter_banner_settings(self.employee.id,self.token,banners)
