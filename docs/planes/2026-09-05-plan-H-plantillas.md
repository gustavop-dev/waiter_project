# Plan H · Plantillas de menú, pago y cuenta (30) con almacén propio

**Objetivo.** El administrador elige en el POS una de las 30 plantillas del catálogo
(`docs/diseno/plantillas/`), personaliza su paleta, su tipografía y su logo, y la app del
comensal muestra la carta real del POS con esa plantilla, de punta a punta: entra por el
NFC, navega, agrega al carrito, "paga" (maquetado: no hay pasarela) y se registra
(maquetado: la verificación por SMS/correo requiere servicios externos) para un descuento
pequeño a cambio de sus datos. Las 30 plantillas funcionan con las fotos del lote demo
(`assets/demo/imagenes/`), ya cargadas en los 22 productos de la base demo.

**Arquitectura (modular, ADR `2026-09-05-plantillas-en-el-modulo-3.md`).**

- El **catálogo de plantillas** vive en `experience/` (módulo 3), como modelo
  `MenuTemplate` sembrado desde `experience/experience_app/plantillas/catalogo/<codigo>.json`.
  Añadir una plantilla = un JSON + su layout en el motor del comensal. Nada vive en el POS
  ni en la app del comensal más allá de renderizar la que se eligió.
- La **elección y personalización por sede** vive también en `experience/`:
  `VenueMenuSettings(restaurant_slug, venue_slug, template_code, palette, typography,
  updated_at)`. El logo sigue siendo el de la marca (Plan G, `res.company.brand_logo`).
- **Escritura desde el POS** sin exponer secretos al navegador: el addon
  `projectapp_ops` expone `/waiter/admin/menu_settings` (controller JSON, `auth='user'`,
  solo `point_of_sale.group_pos_manager`) que reenvía a
  `PUT /internal/v1/<rest>/<sede>/menu/` de experience con `X-Internal-Key`. Odoo conoce
  la URL, la clave y los slugs por `ir.config_parameter`
  (`projectapp.experience_url`, `projectapp.experience_internal_key`,
  `projectapp.restaurant_slug`, `projectapp.venue_slug`; los siembra el onboarding).
- **Lectura pública**: `GET /api/v1/plantillas/` (catálogo con miniaturas) y el contexto de
  entrada trae `plantilla` resuelta (código + tokens finales + layouts).
- El **comensal** (`diner/`) tiene un motor: `plantilla.tokens` → variables CSS
  `--t-*`; `plantilla.layouts` → qué componente pinta cada pantalla. Los datos (carta,
  carrito, pedido, cuenta) son los mismos para las 30. Vista previa sin guardar:
  `?vista_previa=<base64 json>` reemplaza `plantilla` en el cliente (la usa el POS por
  iframe).

## Contrato 1 · Especificación de una plantilla (`spec.json`)

`docs/diseno/plantillas/<codigo>/spec.json` (la escribe el análisis, la siembra el backend):

```json
{
  "codigo": "B1", "nombre": "Rejilla con foto", "familia": "B", "familiaNombre": "Casual de barrio",
  "descripcion": "Una frase de la nota del diseñador: para quién es y qué decide primero el comensal.",
  "fotos": { "requiere": "ninguna|algunas|todas|hero", "recorte": "4x3|1x1|3x4|3x2|ninguno" },
  "tokens": {
    "modo": "claro|oscuro",
    "fondo": "#FAF8F5", "superficie": "#FFFFFF", "tinta": "#1A1815", "tintaSuave": "#6B6259", "tintaTerciaria": "#9A8F7E",
    "borde": "#E4DED4", "acento": "#C1873A", "acentoTinta": "#FFFFFF", "acentoSuave": "#FDF6EA",
    "displayFont": "Instrument Serif", "displayPeso": 400, "displayTracking": "-0.02em", "displayTransform": "none|uppercase",
    "cuerpoFont": "Ubuntu", "monoFont": "IBM Plex Mono",
    "radioTarjeta": 14, "radioBoton": 12, "radioChip": 999, "densidad": "compacta|media|amplia"
  },
  "personalizable": { "colores": ["acento", "fondo", "superficie", "tinta"], "tipografiaDisplay": true, "logo": true },
  "pantallas": {
    "menu":      { "layout": "B1", "resumen": "tabs de categoría arriba, rejilla 2 columnas con foto 4x3, ＋ redondo, barra oscura abajo", "datosOpcionales": ["favorito"] },
    "carrito":   { "layout": "familia-B", "resumen": "…", "descuento5": "linea|banner|chip|sello|usado" },
    "pago":      { "layout": "familia-B", "resumen": "…" },
    "registro":  { "patron": "banner5|portada|beneficios", "resumen": "…" },
    "codigo":    { "patron": "casillas|revisaCorreo|canal", "resumen": "…" },
    "historial": { "patron": "porMes|tarjetas|tablaCufe", "resumen": "…" }
  },
  "fuentesGoogle": ["Instrument Serif", "Bebas Neue"]
}
```

Reglas: los colores son los del marco del diseño (hex exactos). `acento` es el color de
acción; `acentoTinta` el texto sobre él (≥ 4.5:1). En modo oscuro `fondo`/`superficie` son
oscuros y `tinta` clara. `personalizable.colores` lista los tokens que el restaurante puede
cambiar en esa plantilla (siempre incluye `acento`); el resto es del diseño.

## Contrato 2 · Datos estándar de la carta (iguales para las 30)

`entry.carta` de hoy (categorías → productos con `id, nombre, precio, descripcion, foto,
fotoOrigen, agotado, favorito, categorias`) más un campo opcional por producto:
`atributos: { piezas?: number, picante?: 0-3, etiquetas?: string[], alergenos?: string[],
abv?: number, ibu?: number, tamanos?: [{nombre, precio}], soloHoy?: boolean }`. Sale del
addon (`product.template.diner_attributes`, JSON sin vista, editable por RPC; el POS lo
edita en Catálogo en un plan posterior). Una plantilla que tiene hueco para un atributo lo
pinta si existe y lo omite si no; nunca inventa datos.

## Contrato 3 · API de experience

- `GET /api/v1/plantillas/` → `{ familias: {A: "Alta cocina", …}, plantillas: [spec sin
  "pantallas.*.resumen", + miniatura: "/api/v1/plantillas/<codigo>/miniatura/" ] }` (caché
  larga; las miniaturas son los PNG de `docs/diseno/plantillas/<codigo>/menu.png` copiados
  a `experience/experience_app/plantillas/miniaturas/`).
- Contexto de entrada (`GET /api/v1/<rest>/<sede>/[t/<token>/]`): añade
  `plantilla: { codigo, nombre, familia, tokens (finales: catálogo + paleta y tipografía de
  la sede + color/fuente/radio de la marca si la sede no los pisó), layouts: {menu, carrito,
  pago, registro, codigo, historial}, fotos, fuentesGoogle, descuento: { porcentaje: 5,
  activo: true } }`. Sin ajustes de sede: plantilla por defecto `B1`.
- `PUT /internal/v1/<rest>/<sede>/menu/` (X-Internal-Key) body
  `{ plantilla: "B1", paleta: { acento: "#…", … }, tipografia: { display: "Fraunces" } }` →
  valida contra el catálogo (`personalizable`), guarda, invalida caché, devuelve la
  `plantilla` resuelta. `GET` del mismo recurso devuelve los ajustes crudos.
- Cuenta (maquetada pero con datos reales): `POST /api/v1/cuenta/registro/` `{nombre,
  correo, celular, aceptaDatos, novedades}` → crea `DinerAccount` (pendiente) y devuelve
  `{ id, codigoDemo: true }`; `POST /api/v1/cuenta/verificar/` `{ id, codigo }` → en demo
  acepta cualquier código de 6 dígitos, marca verificada, liga la cuenta a la cookie del
  comensal; `GET /api/v1/cuenta/` → perfil + historial (pedidos de esta cuenta en
  experience); `POST /api/v1/cuenta/salir/`. El **descuento** (5 % por defecto,
  `pos.config.signup_discount_percent`) se aplica de verdad al confirmar: líneas con
  `discount` en Odoo si la cuenta está verificada y es su primer pedido; aparece como línea
  propia en carrito, estado y cuenta.
- Pago (maquetado): `POST /api/v1/sesiones/<id>/pago/simulado/` `{ metodo, monto }` → no
  toca Odoo; devuelve `{ estado: "aprobado", referencia, demo: true }`. La UI muestra
  "Autorizando" → "Pagado" con la insignia «Demo · sin cobro real»; el POS sigue cobrando en
  la mesa. Cuando llegue la pasarela, este endpoint se reemplaza por el adaptador real.

## Contrato 4 · Motor del comensal (`diner/`)

- `lib/domain/template.ts`: `Template` (tipo del contexto), `templateVars(t)` →
  `Record<'--t-fondo'|…, string>` (todos los tokens), `applyGoogleFonts(t)`.
- `components/templates/registry.ts`: `MENU_LAYOUTS: Record<code, ComponentType<MenuLayoutProps>>`,
  `CART_LAYOUTS: Record<'A'|…|'F', ComponentType<CartLayoutProps>>`, `PAY_LAYOUTS` (por
  familia), `SIGNUP_PATTERNS: Record<'banner5'|'portada'|'beneficios', …>`,
  `CODE_PATTERNS`, `HISTORY_PATTERNS`. Props:
  - `MenuLayoutProps { entry, template, query, setQuery, category, setCategory, onOpen(dish),
    onAdd(dish), cart, orderBarHref }` (la búsqueda y el filtro son de Waiter; cada layout
    decide dónde los pinta).
  - `CartLayoutProps { cart, template, busy, error, setQty, remove, confirm, goPay, goMenu,
    discount }`, `PayLayoutProps { bill, template, methods, onPay(method), state:
    'idle'|'authorizing'|'paid'|'declined', demo: true, goBack }`.
  - `SignupProps { template, onSubmit, onSkip }`, `CodeProps { template, email, onVerify,
    onResend, onOtherChannel }`, `HistoryProps { template, account, orders, onReorder }`.
- Rutas nuevas en `lib/domain/route.ts`: `pago`, `cuenta/registro`, `cuenta/codigo`,
  `cuenta` (historial). Store: `account`, `pay`.
- Tailwind: utilidades sobre `--t-*` en `@theme inline` (`bg-t-fondo`, `text-t-tinta`,
  `bg-t-acento`, `font-t-display`, `rounded-t-tarjeta`…). Los tokens Waiter fijos (`--w-*`,
  tamaños de toque, escala, barra de pedido) no cambian.

## Contrato 5 · POS (`pos/`)

Configuración › **Plantilla del menú** (solo admin): galería de 30 en seis pestañas por
familia con miniatura, nombre y una frase; al elegir, panel de personalización con los
colores `personalizable` (input color + hex, contraste validado ≥ 4.5 para acento/acentoTinta
y para tinta/fondo), tipografía de títulos (lista curada de seis + la de la plantilla), y
vista previa real por iframe del comensal (`<experience_public_url del comensal>/<rest>/<sede>/?vista_previa=…`),
con Guardar → `callKw('projectapp.admin', …)`? No: `fetch('/waiter/admin/menu_settings')`
al controller del addon (misma sesión de Odoo). Servicio `pos/lib/services/menuTemplates.ts`.

## Tareas (oleadas; 4 agentes concurrentes)

1. [ ] **Análisis** (6 agentes, uno por familia): `spec.json` por plantilla a partir de
   `docs/diseno/plantillas/<codigo>/*.html` + `menu.png`; F2–F5 sin pantallas de cuenta
   (archivo cortado): asignar patrones siguiendo la rotación de su familia y la piel del
   pago; anotarlo en `spec.json.reconstruido`.
2. [ ] **Backend** (experience + addon): catálogo, ajustes por sede, endpoints, contexto,
   cuenta y descuento, pago simulado, pasarela admin en el addon, `diner_attributes`,
   migraciones, tests y contratos.
3. [ ] **POS**: sección Plantilla del menú con galería, personalización y vista previa.
4. [ ] **Motor del comensal**: tokens, registro de layouts, rutas y store de pago/cuenta,
   pantallas base (carrito/pago/cuenta genéricos), modo vista previa.
5. [ ] **Layouts por familia** (6 agentes): 5 menús + carrito + pago + patrones de cuenta
   de la familia, fieles a los marcos; tests; captura propia con `next dev` en puerto propio.
6. [ ] **Integración**: migraciones, `-u projectapp_ops`, miniaturas, E2E (admin elige →
   comensal la ve → carrito → pago simulado → registro), capturas de las 30.
7. [ ] **Revisión adversarial** por lentes, correcciones, docs, PR.

## Supuestos tomados sin el usuario (2026-09-05, noche)

- Pago: se simula la aprobación con insignia «Demo · sin cobro real»; el pedido queda
  pendiente de cobro en el POS. Registro: cualquier código de seis dígitos verifica en demo.
- Cuenta de F2–F5: el catálogo llegó cortado; se reconstruyen con la rotación de patrones de
  la familia F y la piel de su pago. Pedir al usuario el archivo completo o los patrones.
- Atributos por producto (piezas, picante, ABV…): campo JSON en Odoo, sembrado en la demo
  para sushi y cerveza; edición desde el POS en un plan posterior.
- Plantilla por defecto cuando la sede no eligió: `B1` (rejilla con foto), la más cercana
  a la carta actual del comensal.
