{
    "name": "ProjectApp — Interfaz mínima",
    "summary": "Deja Odoo reducido al POS: quita de la barra superior todo lo que no es punto de venta.",
    "version": "19.0.1.0.0",
    "license": "LGPL-3",
    "author": "ProjectApp",
    "category": "Point of Sale",
    "depends": ["web", "point_of_sale"],
    "assets": {
        "web.assets_backend": [
            "projectapp_ui/static/src/css/navbar.css",
        ],
    },
    "installable": True,
    "auto_install": False,
}
