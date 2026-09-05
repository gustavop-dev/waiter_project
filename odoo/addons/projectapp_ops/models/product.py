"""Origen de la imagen de cada producto (trazabilidad de las fotos generadas con IA), sin vistas.

Documento: docs/diseno/2026-09-05-imagenes-menu.md («Trazabilidad» y «Límite legal»). Una imagen
generada no representa la porción servida; en Colombia es exposición a reclamo por publicidad
engañosa. El campo permite listar qué platos siguen con imagen generada (y priorizar la sesión de
fotos real) y hace que la app del comensal muestre «Imágenes de referencia» cuando aplica.
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

    def _load_pos_data_fields(self, *args, **kwargs):
        # La experiencia del comensal (experience/) lee la carta con pos.session.load_data, igual que el POS,
        # y load_data solo devuelve los campos de esta lista: sin añadirlo aquí el origen nunca saldría de Odoo.
        # Si Odoo devuelve [] significa "todos los campos" y se respeta tal cual; nunca se reemplaza la lista,
        # porque el POS necesita las suyas.
        fields_ = super()._load_pos_data_fields(*args, **kwargs)
        if not fields_:
            return fields_
        return fields_ + ["image_origin"]
