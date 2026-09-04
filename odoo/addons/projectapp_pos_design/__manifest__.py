{
    "name": "ProjectApp — Sistema de diseño Waiter (POS)",
    "summary": "Aplica el sistema de diseño Waiter sobre el punto de venta de Odoo.",
    "version": "19.0.1.0.0",
    "license": "LGPL-3",
    "author": "ProjectApp",
    "category": "Point of Sale",
    "depends": ["point_of_sale", "pos_restaurant"],
    "assets": {
        # Los assets del módulo se cargan después de los del core, así que
        # ganan a igualdad de especificidad.
        "point_of_sale._assets_pos": [
            "projectapp_pos_design/static/src/css/01_tokens.css",
            "projectapp_pos_design/static/src/css/02_base.css",
            "projectapp_pos_design/static/src/css/03_pos.css",
        ],
    },
    "installable": True,
    "auto_install": False,
}
