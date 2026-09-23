"""Origen de la imagen de cada producto (trazabilidad de las fotos generadas con IA), sin vistas.

Documento: docs/diseno/2026-09-05-imagenes-menu.md («Trazabilidad» y «Límite legal»). Una imagen
generada no representa la porción servida; en Colombia es exposición a reclamo por publicidad
engañosa. El campo permite listar qué platos siguen con imagen generada (y priorizar la sesión de
fotos real) y hace que la app del comensal muestre «Imágenes de referencia» cuando aplica.

Kit CloudPos (Plan I): `available_from`, la hora a la que un plato agotado vuelve a estar disponible
("Available at 18:00" en la tarjeta del producto).
"""
from odoo import fields, models


class ProductTemplate(models.Model):
    _inherit = "product.template"

    # Sin default: una plantilla sin marcar no afirma nada sobre su foto (ni real ni generada).
    image_origin = fields.Selection(
        [("real", "Foto real"), ("ai", "Generada con IA"), ("placeholder", "Sin foto")],
        string="Origen de la imagen",
        help="Quién produjo la imagen del producto. «Generada con IA» hace que la app del comensal muestre "
             "«Imágenes de referencia»: una imagen generada no representa la porción servida.")

    # Atributos por plato para la app del comensal (Plan H, Contrato 2): un objeto JSON con las claves que las
    # plantillas saben pintar: piezas, picante (0-3), etiquetas[], alergenos[], abv, ibu, tamanos[{nombre, precio}],
    # soloHoy. Se escribe por RPC (el POS lo editará en Catálogo en un plan posterior); experience/ lo parsea con
    # tolerancia: lo que no sea un objeto JSON válido sale como {} y la carta no se rompe.
    diner_attributes = fields.Text(
        string="Atributos para el comensal (JSON)",
        help="Objeto JSON con los datos opcionales que la app del comensal pinta si existen: "
             "piezas, picante (0 a 3), etiquetas, alergenos, abv, ibu, tamanos [{nombre, precio}], soloHoy. "
             "Ejemplo: {\"piezas\": 8, \"picante\": 2, \"etiquetas\": [\"popular\"]}. Vacío: sin atributos.")

    available_from = fields.Datetime(
        string="Disponible desde",
        help="Cuando el plato está agotado, hora (servidor, UTC) a la que vuelve a estar disponible. "
             "Vacío: sin hora anunciada.")

    def _load_pos_data_fields(self, *args, **kwargs):
        # La experiencia del comensal (experience/) lee la carta con pos.session.load_data, igual que el POS,
        # y load_data solo devuelve los campos de esta lista: sin añadirlos aquí el origen y los atributos nunca
        # saldrían de Odoo. Si Odoo devuelve [] significa "todos los campos" y se respeta tal cual; nunca se
        # reemplaza la lista, porque el POS necesita las suyas.
        fields_ = super()._load_pos_data_fields(*args, **kwargs)
        if not fields_:
            return fields_
        return fields_ + ["image_origin", "diner_attributes", "available_from"]
