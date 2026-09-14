from unittest.mock import patch
from experience_app.services.banners import for_menu
from experience_app.tests.conftest import TABLE

def test_banners_filter_hidden_sold_out_and_foreign_catalog_targets():
    menu={'categorias':[{'id':1,'productos':[{'id':3,'agotado':False},{'id':4,'agotado':True}]}]}
    banners=[{'active':True,'target':'product','targetId':3},{'active':True,'target':'product','targetId':4},{'active':True,'target':'product','targetId':99},{'active':True,'target':'category','targetId':1},{'active':False,'target':'none'}]
    with patch('experience_app.services.banners.OdooClient') as client:
        client.return_value.call_kw.return_value={'configured':True,'banners':banners}
        assert for_menu(TABLE,menu)==[banners[0],banners[3]]
        client.return_value.call_kw.assert_called_with('pos.config','waiter_banner_settings',[[TABLE.odoo.pos_config_id]])
        client.return_value.call_kw.return_value={'configured':False,'banners':[]}
        assert for_menu(TABLE,menu) is None
        client.return_value.call_kw.return_value={'configured':True,'banners':[]}
        assert for_menu(TABLE,menu)==[]
