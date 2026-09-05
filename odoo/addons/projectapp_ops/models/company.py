"""Marca del restaurante para la app del comensal (`diner/`), en `res.company` y sin vistas.

Vive en Odoo y no en el registro de ProjectApp porque es el dato que el restaurante
edita en su día a día: todas las tablets del POS y todas las sedes que comparten esta
base ven exactamente lo mismo, y el cambio llega al comensal en menos de un minuto
(caché de `experience/`). El registro solo pone el valor inicial en el onboarding.

Semántica compartida con `experience/` (contrato del bloque de marca):

- Campo vacío en Odoo ⇒ se usa el valor del registro. Por eso todos los campos
  nacen vacíos y ninguno tiene default.
- El nombre del restaurante es `res.company.name`, que ya se edita en
  Configuración › Restaurante.
- `brand_logo` es un ráster (PNG/JPEG/GIF). Nunca SVG: un SVG servido inline desde
  el origen del comensal podría ejecutar script. `experience/` vuelve a comprobarlo
  al servirlo, pero rechazarlo aquí le da al administrador el error en el momento.
- Escritura: solo administradores. Odoo ya restringe `write` en `res.company` al
  grupo `base.group_system`, que es el que tiene el rol `admin` del POS.
- Lectura de "¿hay logo?": `search_read` con contexto `{'bin_size': True}` devuelve
  el tamaño en vez del base64, así el POS y `experience/` no descargan la imagen
  para saber si existe.
"""
import base64
import re

from odoo import _, api, fields, models
from odoo.exceptions import ValidationError

# Las seis tipografías de títulos del sistema de diseño (§06): la lista es cerrada.
FONTS = ["Instrument Serif", "Playfair Display", "Fraunces", "DM Serif Display", "Lora", "Cormorant Garamond"]
# Redondeo en px. Se guarda como texto porque Selection no admite enteros; experience/ lo convierte.
RADII = [("4", "Recto"), ("14", "Suave"), ("24", "Muy redondeado")]
COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")
# Mismas firmas que experience_app/utils/images.py: PNG, JPEG y GIF.
RASTER_SIGNATURES = (b"\x89PNG", b"\xff\xd8", b"GIF8")


class ResCompany(models.Model):
    _inherit = "res.company"

    brand_color = fields.Char(string="Color de acción", size=7, help="#RRGGBB. Vacío: el del registro.")
    brand_font = fields.Selection([(f, f) for f in FONTS], string="Tipografía de títulos")
    brand_radius = fields.Selection(RADII, string="Redondeo")
    brand_tagline = fields.Char(string="Lema", size=60)
    brand_greeting = fields.Char(string="Saludo", size=40)
    brand_waiter_name = fields.Char(string="Nombre del mesero IA", size=40)
    brand_welcome = fields.Char(string="Bienvenida", size=140)
    brand_logo = fields.Binary(string="Logo", attachment=True, help="PNG o JPEG. Nunca SVG.")

    @api.constrains("brand_color")
    def _check_brand_color(self):
        # El color de acción entra al CSS del comensal tal cual: solo #RRGGBB (o vacío).
        for company in self:
            if company.brand_color and not COLOR_RE.match(company.brand_color):
                raise ValidationError(_("El color de acción debe ser #RRGGBB, por ejemplo #7A2E2A."))

    @api.constrains("brand_logo")
    def _check_brand_logo(self):
        # bin_size=False: con bin_size en el contexto el campo devolvería el tamaño, no los bytes.
        for company in self.with_context(bin_size=False):
            if not company.brand_logo:
                continue
            try:
                head = base64.b64decode(company.brand_logo)[:4]
            except (ValueError, TypeError):
                head = b""
            if not head.startswith(RASTER_SIGNATURES):
                raise ValidationError(_("El logo debe ser una imagen PNG, JPEG o GIF (no SVG)."))
