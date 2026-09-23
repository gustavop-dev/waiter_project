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
- `brand_logo` es un ráster (PNG/JPEG/GIF) de hasta MAX_LOGO_BYTES. Nunca SVG: un SVG
  servido inline desde el origen del comensal podría ejecutar script. `experience/`
  vuelve a comprobar las dos cosas al servirlo, pero rechazarlas aquí le da al
  administrador el error en el momento.
- Escritura: SOLO por `write_brand()`, y solo para el rol `admin` del POS
  (`point_of_sale.group_pos_manager`). `res.company.write` exige
  `base.group_erp_manager`, que el rol `admin` NO tiene (users.py, a propósito: no
  es administrador de Odoo). `write_brand` comprueba el grupo del POS, acepta solo la
  lista cerrada de campos `brand_*`, los limpia y escribe con sudo() sobre la compañía
  del usuario. No se concede `base.group_erp_manager` para no abrir el resto de Odoo.
- Lectura de "¿hay logo?": `search_read` con contexto `{'bin_size': True}` devuelve
  el tamaño en vez del base64, así el POS y `experience/` no descargan la imagen
  para saber si existe.
"""
import base64
import re

from odoo import _, api, fields, models
from odoo.exceptions import AccessError, ValidationError

# Las seis tipografías de títulos del sistema de diseño (§06): la lista es cerrada.
FONTS = ["Instrument Serif", "Playfair Display", "Fraunces", "DM Serif Display", "Lora", "Cormorant Garamond"]
# Redondeo en px. Se guarda como texto porque Selection no admite enteros; experience/ lo convierte.
RADII = [("4", "Recto"), ("14", "Suave"), ("24", "Muy redondeado")]
COLOR_RE = re.compile(r"^#[0-9A-Fa-f]{6}$")
# Mismas firmas que experience_app/utils/images.py: PNG, JPEG y GIF.
RASTER_SIGNATURES = (b"\x89PNG", b"\xff\xd8", b"GIF8")
# Tope del logo en bytes decodificados. experience/ aplica el mismo (MAX_LOGO_BYTES en utils/images.py).
MAX_LOGO_BYTES = 2_000_000
# Para el sniff bastan los primeros 16 bytes del binario: 24 caracteres de base64 (múltiplo de 4, sin relleno).
SNIFF_CHARS = 24
# Lo único que write_brand deja tocar. Cualquier otra clave (name, vat, users...) es un error, no se ignora.
BRAND_FIELDS = ["brand_color", "brand_font", "brand_radius", "brand_tagline", "brand_greeting", "brand_waiter_name",
                "brand_welcome", "brand_logo"]


def decoded_size(encoded) -> int:
    """Bytes que ocupará un base64 al decodificarlo, sin decodificarlo: 3 por cada 4 caracteres, menos el relleno final."""
    padding = encoded[-2:].count("=" if isinstance(encoded, str) else b"=")
    return len(encoded) * 3 // 4 - padding


def logo_head(encoded) -> bytes:
    """Primeros bytes del logo, decodificando solo el principio del base64: un logo de 2 MB no se decodifica para mirar 4 bytes."""
    try:
        return base64.b64decode(encoded[:SNIFF_CHARS])[:4]
    except (ValueError, TypeError):
        return b""


class ResCompany(models.Model):
    _inherit = "res.company"

    brand_color = fields.Char(string="Color de acción", size=7, help="#RRGGBB. Vacío: el del registro.")
    brand_font = fields.Selection([(f, f) for f in FONTS], string="Tipografía de títulos")
    brand_radius = fields.Selection(RADII, string="Redondeo")
    brand_tagline = fields.Char(string="Lema", size=60)
    brand_greeting = fields.Char(string="Saludo", size=40)
    brand_waiter_name = fields.Char(string="Nombre del mesero IA", size=40)
    brand_welcome = fields.Char(string="Bienvenida", size=140)
    brand_logo = fields.Binary(string="Logo", attachment=True, help="PNG o JPEG de hasta 2 MB. Nunca SVG.")

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
            # El tamaño se mide sobre el base64: no hace falta decodificar 2 MB para saber que sobran.
            if decoded_size(company.brand_logo) > MAX_LOGO_BYTES:
                raise ValidationError(_("El logo no puede pesar más de 2 MB."))
            if not logo_head(company.brand_logo).startswith(RASTER_SIGNATURES):
                raise ValidationError(_("El logo debe ser una imagen PNG, JPEG o GIF (no SVG)."))

    waiter_latitude = fields.Char(string='Latitud del restaurante')
    waiter_longitude = fields.Char(string='Longitud del restaurante')

    @api.constrains('waiter_latitude', 'waiter_longitude')
    def _check_menu_location(self):
        import math
        for company in self:
            pair = (company.waiter_latitude, company.waiter_longitude)
            if bool(pair[0]) != bool(pair[1]):
                raise ValidationError('Completa latitud y longitud, o deja ambas vacías.')
            for value, limit in zip(pair, (90, 180)):
                if not value:
                    continue
                try:
                    valid = math.isfinite(float(value)) and abs(float(value)) <= limit
                except ValueError:
                    valid = False
                if not valid:
                    raise ValidationError('Las coordenadas del restaurante no son válidas.')

    @api.model
    def write_brand(self, vals):
        """Escribe la marca de la compañía del usuario. Es la ÚNICA vía del POS: `write` no está al alcance del rol admin.

        RPC: call_kw('res.company', 'write_brand', [vals]). `vals` solo admite BRAND_FIELDS; los textos se recortan y
        vacíos viajan como False ("usa el valor del registro"); el color se valida como #RRGGBB y se normaliza a
        mayúsculas; el logo lo valida la constraint (ráster, ≤ 2 MB). Devuelve True.
        """
        if not self.env.user.has_group("point_of_sale.group_pos_manager"):
            raise AccessError(_("Solo un administrador puede cambiar la marca"))
        if not isinstance(vals, dict):
            raise ValidationError(_("La marca debe llegar como un diccionario de campos."))
        unknown = sorted(set(vals) - set(BRAND_FIELDS))
        if unknown:
            raise ValidationError(_("Estos campos no son de la marca: %s", ", ".join(unknown)))
        clean = {}
        for key, value in vals.items():
            if key == "brand_logo":
                # False/None/'' quitan el logo; el base64 se pasa tal cual y la constraint lo juzga.
                clean[key] = value or False
                continue
            if isinstance(value, bool) or value is None:
                value = ""
            elif isinstance(value, int):
                value = str(value)  # brand_radius puede llegar como 14 en vez de '14'
            if not isinstance(value, str):
                raise ValidationError(_("El campo %s debe ser texto.", key))
            value = value.strip()
            if key == "brand_color" and value:
                if not COLOR_RE.match(value):
                    raise ValidationError(_("El color de acción debe ser #RRGGBB, por ejemplo #7A2E2A."))
                value = value.upper()
            if key == "brand_font" and value and value not in FONTS:
                raise ValidationError(_("La tipografía debe ser una de: %s.", ", ".join(FONTS)))
            if key == "brand_radius" and value and value not in dict(RADII):
                raise ValidationError(_("El redondeo debe ser 4, 14 o 24."))
            clean[key] = value or False
        # sudo(): el rol admin del POS no tiene base.group_erp_manager (el que exige res.company.write); ya se comprobó
        # arriba que es administrador del POS y solo puede tocar su propia compañía y solo estos campos.
        self.env.company.sudo().write(clean)
        return True
