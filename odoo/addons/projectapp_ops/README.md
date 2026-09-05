# projectapp_ops

Addon **sin interfaz** para el backoffice propio (`pos/`): `pos.order.waiter_origin`
(mesero / comensal / IA), umbrales de alerta y supuestos del ROI en `pos.config`
(llegan al cliente por `load_data`), marca del restaurante en `res.company`, origen de
la imagen y atributos para el comensal en `product.template`, descuento de primera compra en
`pos.config` y la pasarela `/waiter/admin/menu_settings` hacia `experience/`. Instalación:
`-i projectapp_ops`.

## Roles (`res.users.waiter_role`)

| Rol | Pantallas en `pos/` | Grupos de Odoo |
|---|---|---|
| `waiter` | salón, pedido, cocina, en vivo, clientes | POS usuario |
| `cashier` | + caja, ventas, facturación | + facturación |
| `admin` | todo + forzar cierre de caja | POS administrador, productos, inventario, facturación |

Al crear o cambiar el rol, el addon reasigna los grupos. Los usuarios se crean
desde Configuración → Usuarios. Demo: `sofia` (mesero) y `julian` (cajero),
clave `Waiter-2026`.

## Marca del restaurante (`res.company.brand_*`)

Lo que el comensal ve en `diner/` (sistema de diseño §06), editado por
administradores desde el POS y leído por `experience/` (caché de ≤ 1 minuto).
**Campo vacío ⇒ se usa el valor del registro de ProjectApp** (onboarding); todos
nacen vacíos. El nombre del restaurante es `res.company.name`.

| Campo | Tipo | Regla |
|---|---|---|
| `brand_color` | Char(7) | `#RRGGBB` o vacío (constraint). El texto encima se calcula en `experience/` (contraste ≥ 4.5). |
| `brand_font` | Selection | Una de las seis: Instrument Serif, Playfair Display, Fraunces, DM Serif Display, Lora, Cormorant Garamond. |
| `brand_radius` | Selection | `'4'` recto · `'14'` suave · `'24'` muy redondeado. |
| `brand_tagline` | Char(60) | Lema bajo el nombre. |
| `brand_greeting` | Char(40) | Saludo ("Buenas noches"). |
| `brand_waiter_name` | Char(40) | Nombre del mesero IA. |
| `brand_welcome` | Char(140) | Texto de bienvenida. |
| `brand_logo` | Binary (attachment) | PNG, JPEG o GIF (constraint). **Nunca SVG.** |

- Escritura: solo administradores (Odoo restringe `write` de `res.company` a `base.group_system`).
- ¿Hay logo sin descargarlo? `search_read` con `context={'bin_size': True}` devuelve el tamaño en vez del base64.
- `write_date` de la compañía versiona la URL pública del logo (`/api/v1/<rest>/<sede>/logo/?v=YYYYMMDDhhmmss`).
- Actualizar en un Odoo ya instalado: `-u projectapp_ops` (agrega las columnas; no hay datos ni vistas).

## Origen de la imagen (`product.template.image_origin`)

Trazabilidad de las fotos de la carta (`docs/diseno/2026-09-05-imagenes-menu.md`, «Trazabilidad»
y «Límite legal»): `'real'` foto real · `'ai'` generada con IA · `'placeholder'` sin foto.
**Sin default**: una plantilla sin marcar no afirma nada sobre su foto. Se escribe por RPC (la
herramienta que genera las imágenes lo marca al cargarlas) y viaja en `pos.session.load_data`
junto a los demás campos de `product.template`, así que lo ven el POS y `experience/`.

- `experience/` lo traduce a `fotoOrigen` (`'real'` · `'ia'` · `'placeholder'` · `null`) en cada
  plato y enciende `imagenesDeReferencia` en la carta cuando algún plato con foto está marcado
  `'ai'`; la app del comensal muestra entonces «Imágenes de referencia: la porción servida puede variar».
- Límite legal: una imagen generada no representa la porción servida. Marcar el origen no es
  opcional cuando la foto es generada.
- Actualizar en un Odoo ya instalado: `-u projectapp_ops` (agrega la columna; no hay datos ni vistas).

## Descuento de primera compra (`pos.config.signup_discount_percent`)

Plan H. `Float`, por defecto `5.0`; `0` lo apaga. Viaja en `pos.session.load_data` (añadido en
`_load_pos_data_fields`, `models/config.py`), así que `experience/` lo lee con la carta y lo aplica
**de verdad** al confirmar: las líneas del comensal con cuenta verificada llegan a Odoo con
`pos.order.line.discount = <porcentaje>`, una sola vez por cuenta (`DinerAccount.discount_used_at`).
Si el campo no existe aún (`-u projectapp_ops` pendiente) `experience/` asume el 5 % del diseño.

## Atributos por plato (`product.template.diner_attributes`)

Plan H, Contrato 2. `Text` con un objeto JSON, sin vistas, editable por RPC (el POS lo editará en
Catálogo en un plan posterior):

```json
{"piezas": 8, "picante": 2, "etiquetas": ["popular"], "alergenos": ["maní"], "abv": 5.2, "ibu": 40,
 "tamanos": [{"nombre": "Copa", "precio": 18000}], "soloHoy": true}
```

Viaja en `load_data` junto a `image_origin`; `experience/` lo parsea con tolerancia (lo que no sea un
objeto JSON válido sale como `{}`) y lo expone en cada plato como `atributos`. Una plantilla del
comensal pinta el atributo si existe y lo omite si no; nunca inventa datos.

## Pasarela de la plantilla del menú (`/waiter/admin/menu_settings`)

Plan H. Controller JSON-RPC (`controllers/admin.py`), `auth='user'`, solo
`point_of_sale.group_pos_manager` (los demás reciben `AccessError`). Reenvía a
`GET/PUT /internal/v1/<rest>/<sede>/menu/` de `experience/` con `X-Internal-Key`, `requests` y
10 s de espera; los errores de red y los rechazos de `experience/` llegan al POS como `UserError`
en español. Así el navegador nunca conoce la clave interna.

| Acción | Cuerpo (`params`) | Respuesta |
|---|---|---|
| `get` | — | `{restaurante, sede, experienceUrl, dinerUrl, ajustes: {plantilla, paleta, tipografia, actualizado, porDefecto}}` |
| `set` | `{plantilla: "B1", paleta: {acento: "#…"}, tipografia: {display: "Fraunces"}}` | `{plantilla: <la resuelta que verá el comensal>}` |

Parámetros del sistema (`ir.config_parameter`) que debe sembrar el onboarding:

| Clave | Valor |
|---|---|
| `projectapp.experience_url` | URL base de `experience/` (dev: `http://192.168.56.10:8001`) |
| `projectapp.experience_internal_key` | el `EXPERIENCE_INTERNAL_KEY` de `experience/.env` |
| `projectapp.restaurant_slug` | slug del restaurante en el registro (demo: `burger-house`) |
| `projectapp.venue_slug` | slug de la sede (demo: `poblado`) |
| `projectapp.diner_url` | URL pública de la app del comensal (dev: `http://192.168.56.10:3001`), para la vista previa por iframe |

En dev: `EXPERIENCE_INTERNAL_KEY=… odoo/provisioning/seed-menu-params.sh` (usa `odoo shell` en el
compose). A mano, desde `odoo shell -d projectapp`:

```python
icp = env['ir.config_parameter'].sudo()
icp.set_param('projectapp.experience_url', 'http://192.168.56.10:8001')
icp.set_param('projectapp.experience_internal_key', '<EXPERIENCE_INTERNAL_KEY>')
icp.set_param('projectapp.restaurant_slug', 'burger-house')
icp.set_param('projectapp.venue_slug', 'poblado')
icp.set_param('projectapp.diner_url', 'http://192.168.56.10:3001')
env.cr.commit()
```

- Actualizar en un Odoo ya instalado: `-u projectapp_ops` (agrega las dos columnas; no hay datos ni vistas).
- Tests del addon (`tests/test_menu_settings.py`): `-u projectapp_ops --test-enable` en una base de prueba.

## Invitaciones y códigos

`send_waiter_invite()` genera un código de 6 dígitos (hash en `waiter_invite_code`,
vence a las 48 h) y lo envía por `mail.mail` desde `mail.default.from`.
Endpoints públicos (`controllers/auth.py`): `POST /waiter/auth/request_code`
y `POST /waiter/auth/activate` (JSON-RPC, sin sesión). El correo saliente se
configura con `odoo/provisioning/configure-mail.sh` desde `compose/.env`.
