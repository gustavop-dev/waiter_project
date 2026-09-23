{
    "name": "ProjectApp — Reservas de mesa",
    "summary": "Reservas por franja de 30 minutos con mesa, personas, silla de bebé, pre-pedido y correo de confirmación. Sin vistas: lo consume el POS propio.",
    "version": "19.0.1.0.0",
    "license": "LGPL-3",
    "author": "ProjectApp",
    "category": "Point of Sale",
    "depends": ["pos_restaurant", "mail"],
    "data": [
        "security/ir.model.access.csv",
        "data/sequence.xml",
        "data/mail_template.xml",
    ],
    "installable": True,
    "auto_install": False,
}
