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
| `brand_logo` | Binary (attachment) | PNG, JPEG o GIF de **hasta 2 MB** (constraint; el sniff decodifica solo los primeros bytes). **Nunca SVG.** |

- **Escritura: el POS llama `write_brand`, nunca `write`.** `res.company.write` exige
  `base.group_erp_manager`, que el rol `admin` del POS no tiene (y no se le da: abriría
  el resto de Odoo). `write_brand` exige `point_of_sale.group_pos_manager` (si no,
  `AccessError` "Solo un administrador puede cambiar la marca"), acepta SOLO las claves
  `brand_*` de la tabla (otra clave ⇒ `ValidationError`), recorta los textos (vacío ⇒
  `False` = "usa el registro"), valida el color `#RRGGBB` (y lo pone en mayúsculas), la
  fuente y el radio, y escribe con `sudo()` sobre la compañía del usuario:

  ```js
  await callKw('res.company', 'write_brand', [{ brand_color: '#7A2E2A', brand_tagline: 'Cocina de barrio', brand_logo: false }])
  ```

- ¿Hay logo sin descargarlo? `search_read` con `context={'bin_size': True}` devuelve el tamaño en vez del base64.
- `write_date` de la compañía versiona la URL pública del logo (`/api/v1/<rest>/<sede>/logo/?v=YYYYMMDDhhmmss`).
- Actualizar en un Odoo ya instalado: `-u projectapp_ops` (agrega las columnas; no hay datos ni vistas).
- Tests: `tests/test_company_brand.py` corre dentro de Odoo (`--test-enable --test-tags /projectapp_ops`); la lógica
  pura también se prueba sin Odoo en `experience/experience_app/tests/addon/`.

## Invitaciones y códigos

`send_waiter_invite()` genera un código de 6 dígitos (hash en `waiter_invite_code`,
vence a las 48 h) y lo envía por `mail.mail` desde `mail.default.from`.
Endpoints públicos (`controllers/auth.py`): `POST /waiter/auth/request_code`
y `POST /waiter/auth/activate` (JSON-RPC, sin sesión). El correo saliente se
configura con `odoo/provisioning/configure-mail.sh` desde `compose/.env`.
