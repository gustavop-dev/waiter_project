# projectapp_ops

Addon **sin interfaz** para el backoffice propio (`pos/`): `pos.order.waiter_origin`
(mesero / comensal / IA), umbrales de alerta y supuestos del ROI en `pos.config`
(llegan al cliente por `load_data`). Instalación: `-i projectapp_ops`.

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

## Invitaciones y códigos

`send_waiter_invite()` genera un código de 6 dígitos (hash en `waiter_invite_code`,
vence a las 48 h) y lo envía por `mail.mail` desde `mail.default.from`.
Endpoints públicos (`controllers/auth.py`): `POST /waiter/auth/request_code`
y `POST /waiter/auth/activate` (JSON-RPC, sin sesión). El correo saliente se
configura con `odoo/provisioning/configure-mail.sh` desde `compose/.env`.
