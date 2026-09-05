# Bloque 3 — Experiencia del comensal

> Contexto posterior (Plan H, 2026-09-05): `experience/` guarda las 30 plantillas y los
> ajustes por sede; `diner/` renderiza y el POS administra. Descuento real con reserva
> atómica; pago simulado después de confirmar; cuenta demo ligada al desafío de la
> misma cookie, sin recuperación de cuentas existentes y deshabilitada en producción.
> El diseño y los planes anteriores conservan su alcance histórico; el estado ejecutado
> y sus límites están en [la revisión de H](../revisiones/2026-09-05-cierre-H-pr14.md).

- **Fecha:** 2026-09-04
- **Estado:** backend implementado el 2026-09-05 (`experience/`, Plan D); plantillas, cuenta, descuento y pago simulado el 2026-09-05 (Plan H); pasarela real e IA pendientes
- **Depende de:** [arquitectura modular](2026-09-04-arquitectura-modular.md),
  [una base por restaurante](../decisiones/2026-09-04-multi-tenant.md)

## Propósito

Servir la carta pública, el carrito, el pedido y el pago al comensal. Es el
bloque diferenciador del producto: todo lo que el cliente final toca vive aquí.

**En esta etapa se construye solo el backend.** Sin frontend. La API que se
define aquí es el contrato contra el que después se construyen la PWA y el
Mesero IA — que no es más que otro cliente de estas mismas operaciones.

## Cómo sirve

Dos entradas públicas, una sola maquinaria:

```text
/burger-house/poblado                 domicilio
/burger-house/poblado/t/8H2KQ7        mesa
```

La única diferencia es que la segunda resuelve una mesa. Carta, carrito, pedido
y pago son idénticos. No se construyen dos productos.

### Resolución jerárquica

El token **no se busca globalmente**: restaurante → sede → mesa. Es
responsabilidad del bloque 3 imponer ese alcance, porque **Odoo no lo hace**:

```python
# pos_self_order/controllers/orders.py:198
table_sudo = request.env["restaurant.table"].sudo().search(
    [('identifier', '=', table_identifier)], limit=1)
```

Busca en toda la base con `limit=1`, sin acotar por configuración de POS ni por
sede. Si dos sedes del mismo restaurante comparten identificador, Odoo elige una
arbitrariamente.

## Modelo de datos

La sección 11 de la visión pide pedidos independientes, carrito compartido,
consumo identificado por persona y pago parcial. Un solo modelo las satisface:

```text
SesionMesa            (sede, mesa, abierta_en, estado)
   ├── Comensal A     (cookie, sin login)
   │      └── LineaCarrito ──┐
   ├── Comensal B            ├──▶ carrito de la mesa
   │      └── LineaCarrito ──┘
   └── estado: componiendo → confirmada → pagada → cerrada
```

**Cada línea sabe de qué comensal es.** Con eso:

- "pagar lo mío" es un filtro por comensal;
- "dividir en partes iguales" es una división del total;
- "carrito compartido" es la vista sin filtrar.

No hay que elegir entre modos: se soportan todos porque la atribución vive en la
línea, no en el carrito.

El comensal se identifica con una cookie, **sin registro**. Si cierra el
navegador y vuelve a tocar el NFC, recupera su sesión.

Para domicilio la `SesionMesa` existe igual, con `mesa = null`.

## La carta: caché por sede

**Odoo no está en el camino caliente.** El bloque 3 mantiene la carta
normalizada en caché por sede y la sirve desde ahí. Sin esto, cada comensal que
abre el menú golpea los workers de Odoo; en hora pico con 40 mesas eso no se
sostiene.

- **TTL corto** más invalidación explícita cuando la carta cambia.
- **La disponibilidad no se confía a la caché.** Un producto agotado puede seguir
  apareciendo mientras el comensal navega; el punto de verdad es la
  confirmación, donde Odoo valida y puede rechazar.

Esto es aceptable porque Odoo ya recalcula los precios en el servidor e ignora
los que envía el cliente (`recompute_prices()`), de modo que una caché
desactualizada nunca produce un cobro incorrecto.

## Confirmación del pedido

El pedido llega a Odoo **al confirmar el carrito**, no antes. Odoo solo ve
pedidos reales; no se llena de borradores abandonados.

Si el comensal pide más después, es otra comanda sobre la misma
`SesionMesa`.

### Idempotencia

La confirmación debe poder reintentarse: el móvil pierde señal, el usuario toca
dos veces. Odoo resuelve esto de forma nativa:

```python
# point_of_sale/models/pos_order.py:1258
def _get_open_order(self, order):
    return self.env["pos.order"].search(
        [('uuid', '=', order.get('uuid'))], limit=1, order='id desc')
```

El bloque 3 genera un `uuid` por confirmación y lo reutiliza en los reintentos.
Odoo actualiza el pedido existente en vez de duplicarlo.

## La sesión de caja: se abre por código, no la abre el restaurante

El pedido llega a Odoo **cuando la pasarela ya confirmó el pago**. No hay dinero
que contar ni caja que cuadrar en el momento de entrar el pedido.

Aun así Odoo exige una `pos.session` abierta. Conviene entender exactamente de
qué tipo de exigencia se trata:

- En la base, `pos_order.session_id` **es nullable** y el campo no lleva
  `required=True`. No es una restricción del modelo de datos.
- El rechazo viene del **controlador de self-order** de Odoo:

```python
# pos_self_order/controllers/orders.py:189
def _verify_config_constraint(self, pos_config_sudo, check_active_session=True):
    return (... or (check_active_session and not pos_config_sudo.has_active_session))
    # -> raise Unauthorized("Invalid access token")
```

Como el bloque 3 habla con Odoo por su **API externa** y no por ese controlador,
esa guarda no nos aplica.

**Aun así se abre la sesión**, y no por obligación sino por conveniencia: la
sesión es la unidad contable de Odoo. Los reportes, los asientos y los
movimientos de inventario cuelgan de ella. Un pedido sin sesión queda fuera de
todo eso.

La abre el sistema, no el restaurante. Verificado:

```python
s = env['pos.session'].create({'config_id': cfg.id, 'user_id': uid})
s.action_pos_session_open()
# -> state='opening_control', has_active_session=True
```

El aprovisionamiento abre la sesión del canal de autoservicio y la rota
periódicamente. **El personal del restaurante nunca tiene que abrir nada** para
que el autoservicio funcione, que es justamente el punto del producto.

### Trampa: activar un idioma exige reiniciar el worker

Verificado. Tras activar `es_CO`, los pedidos fallaban con:

```text
UserError: Invalid language code: es_CO
```

aunque el idioma estuviera activo en la base. La causa es una caché de proceso:

```python
# odoo/orm/environments.py:296
@functools.cached_property
def lang(self) -> str | None:
    lang = self.context.get('lang')
    if lang and lang != 'en_US' and not self['res.lang']._get_data(code=lang):
        raise UserError(f'Invalid language code: {lang}')
```

El worker que ya estaba corriendo no ve el idioma nuevo. **El script de
aprovisionamiento debe reiniciar Odoo tras activar el idioma**, o el canal de
autoservicio queda roto con un error que no señala la causa.

## Contrato de la API

Las rutas reales llevan barra final (convención del fleet). Un `TableSession`
tiene **un** `pos.order`; cada confirmación agrega líneas bajo el mismo uuid y
dispara una comanda nueva.

```text
GET  /api/v1/<rest>/<sede>/t/<token>     contexto de mesa + carta
GET  /api/v1/<rest>/<sede>               contexto domicilio + carta
POST /api/v1/sesiones                     abre sesión de comensal
GET  /api/v1/sesiones/<id>/carrito        carrito de la mesa, con atribución
POST /api/v1/sesiones/<id>/lineas         agrega al carrito
PATCH/DELETE  .../lineas/<id>             modifica o quita
POST /api/v1/sesiones/<id>/confirmar      → Odoo → cocina (idempotente)
GET  /api/v1/pedidos/<id>                 estado del pedido
GET  /api/v1/<rest>/<sede>/fotos/<id>/?v=<versión>&tam=tarjeta|plato   foto del plato (bytes + content-type real; 404 sin foto, 400 tamaño inválido)
GET  /api/v1/<rest>/<sede>/logo/?v=<versión>                            logo del restaurante (brand_logo de Odoo; solo ráster, 404 si no hay o no es PNG/JPEG/GIF)
POST /api/v1/sesiones/<id>/llamar         el comensal llama al mesero (llega al salón por Odoo)
POST /api/v1/sesiones/<id>/cuenta         pide la cuenta: todo / lo mío / dividir (+ descuento; totales netos)
POST /api/v1/sesiones/<id>/pago/simulado/ {metodo, monto} → {estado: "aprobado", referencia, demo: true}; no toca Odoo
GET  /api/v1/plantillas/                  catálogo público de plantillas (Plan H) con miniaturas; caché 1 h
GET  /api/v1/plantillas/<codigo>/miniatura/   PNG del menú de la plantilla; caché inmutable
POST /api/v1/cuenta/registro/             {nombre, correo, celular, aceptaDatos, novedades} → {id, codigoDemo: true}
POST /api/v1/cuenta/verificar/            {id, codigo} → demo: cualquier código de 6 dígitos; liga la cuenta a la cookie
GET  /api/v1/cuenta/                      perfil + historial (pedidos de las sesiones donde participó la cuenta)
POST /api/v1/cuenta/salir/                desliga la cuenta de la cookie
PUT/GET /internal/v1/<rest>/<sede>/menu/  (X-Internal-Key) ajustes de plantilla de la sede; el PUT devuelve la resuelta
POST /internal/v1/carta/<rest>/<sede>/invalidar/   (X-Internal-Key) tira la carta, la marca y la plantilla de la caché
```

`fotos/` y `logo/` comparten las mismas defensas: se sirve solo lo que los
bytes dicen ser (PNG/JPEG/GIF por *sniff*; un SVG ⇒ 404 porque desde el
origen de la API permitiría XSS), `X-Content-Type-Options: nosniff`, CSP
`default-src 'none'; sandbox`, `Content-Disposition: inline`, y
`Cache-Control` inmutable cuando `v` coincide con la versión actual y
`no-store` cuando no. La versión del logo es el `write_date` de `res.company`
compactado (`YYYYMMDDhhmmss`); la de las fotos, la del producto.

## Marca: precedencia Odoo > registro

`contexto.marca` se arma con dos fuentes (ADR
[la marca se edita desde el POS](../decisiones/2026-09-05-marca-desde-el-pos.md)):

1. **Odoo, `res.company`** (campos `brand_*` del addon `projectapp_ops`, sin
   vistas): lo que el administrador del restaurante edita en Configuración ›
   Marca del POS. El nombre es `res.company.name`.
2. **El registro central** (`Restaurant.brand_*`, `tagline`, `greeting`,
   `waiter_name`, `logo_url`): el valor **inicial** que ProjectApp deja en el
   onboarding.

La regla es **campo a campo**: un valor no vacío en Odoo gana; un campo vacío
en Odoo cae al registro. Sobre el color final se deriva el tema
(`colorTexto`, `colorSuave`, `contraste`) con las mismas reglas que
`registry/registry_app/utils/brand.py` (tinta blanca o `#1A1815` según
contraste ≥ 4.5, suave = mezcla al 10 % sobre blanco, seis fuentes curadas,
radios 4 | 14 | 24); un test de paridad en `experience/` impide que las dos
copias diverjan. `logo` es la URL relativa de `logo/` (con `v`) si hay
`brand_logo` en Odoo; si no, `logo_url` del registro o `null`.

La marca se cachea `settings.BRAND_CACHE_SECONDS` (env `BRAND_CACHE_SECONDS`,
60 por defecto), aparte de la carta (`MENU_CACHE_SECONDS`) y del tenant
(`TENANT_CACHE_SECONDS`). No hay invalidación explícita: un cambio desde el
POS llega al comensal en ≤ 1 minuto, y el logo se vuelve a descargar porque
cambia `v`.

## Plantillas del menú (Plan H)

ADR [las plantillas viven en el módulo 3](../decisiones/2026-09-05-plantillas-en-el-modulo-3.md).
El catálogo es `experience_app/plantillas/catalogo/<codigo>.json` (Contrato 1, copiado del
diseño con `tools/diseno/sincronizar_catalogo.py`, que también trae las miniaturas a
`plantillas/miniaturas/`) y se siembra por upsert en `MenuTemplate` con `manage.py
seed_templates` **y** al terminar cada `migrate` (señal `post_migrate` de la app; se eligió la
señal y no una migración de datos para que un JSON corregido llegue a la base sin migración
nueva; nunca borra). La elección de la sede es `VenueMenuSettings(restaurant_slug, venue_slug,
template, palette, typography)`.

`contexto.plantilla` (Contrato 3) se resuelve así: `spec.tokens` ← marca del Plan G (`acento` =
color, `displayFont` = tipografía, radios escalados desde `brand_radius`; las píldoras de 999 no
cambian) ← paleta y tipografía de la sede (solo los tokens de `personalizable`). Si el acento
final no es el del diseño se recalculan `acentoTinta` (`utils/brand.ink_for`) y `acentoSuave`
(10 % del acento sobre el fondo de la plantilla). `layouts` sale de `spec.pantallas` (`layout`
para menú/carrito/pago, `patron` para registro/código/historial); `fuentesGoogle` sigue a la
tipografía final. `descuento.porcentaje` es `pos.config.signup_discount_percent` (llega con
`load_data`; 5 si el addon no lo entrega). Sin ajustes: `B1`; sin `B1`: la primera del
catálogo; catálogo vacío: el spec embebido (`plantillas/defaults.py`), para que el comensal nunca
se quede sin tokens. Caché `TEMPLATE_CACHE_SECONDS` (env, 60 s) por sede, invalidada por el
`PUT` interno y por `invalidar/`.

El `PUT` interno valida: código existente, colores `#RRGGBB` solo en `personalizable.colores`,
tipografía en la lista curada de `utils/brand.FONTS` o la propia de la plantilla, contraste
acento/`ink_for(acento)` ≥ 4.5 y tinta/fondo ≥ 4.5 si la paleta los toca. Lo llama el addon
(`/waiter/admin/menu_settings`, solo gerentes del POS) con la clave interna que Odoo guarda en
`ir.config_parameter` (`projectapp.experience_url`, `projectapp.experience_internal_key`,
`projectapp.restaurant_slug`, `projectapp.venue_slug`, `projectapp.diner_url`; en dev,
`odoo/provisioning/seed-menu-params.sh`).

## Cuenta, descuento y pago simulado (Plan H)

`DinerAccount` (nombre, correo, celular, política de datos, novedades, verificada, descuento
usado) se liga al `Diner` de la cookie al verificar y **viaja con la cookie**: otra visita crea
otro comensal, pero hereda la cuenta. Un correo ya verificado devuelve su cuenta al registrarse
de nuevo («Ya tengo cuenta» es el mismo camino). La verificación es demo (cualquier código de
seis dígitos): `services/account.py` marca dónde entra el proveedor real de códigos.

El **descuento de primera compra** se aplica de verdad al confirmar (`services/orders.py`): si
quien confirma tiene cuenta verificada con `discount_used_at` vacío, **sus** líneas nuevas van a
Odoo con `pos.order.line.discount = porcentaje` (se guarda en `CartLine.discount` para que un
reenvío del mismo uuid no lo pierda) y la cuenta queda marcada solo cuando Odoo aceptó el pedido.
Carrito y cuenta exponen `descuento: {porcentaje, monto, aplicable, aplicado}` sobre las líneas
del comensal (precio final con impuestos): en el carrito los totales siguen brutos y `monto` es
lo que descontará; en la cuenta los totales son netos y `monto` lo ya aplicado.

El **pago** es maquetado: `pago/simulado/` aprueba con referencia `DEMO-…`, deja rastro en el log
y no toca Odoo ni la sesión; el POS sigue cobrando en la mesa. La pasarela real reemplaza este
endpoint en `experience_app/payments/`.

## Estructura

```text
experience/
├── catalogo/       carta normalizada + caché por sede
├── plantillas/     catálogo de plantillas, ajustes por sede, plantilla resuelta (Plan H)
├── sesiones/       sesión de mesa, comensales, carrito
├── pedidos/        confirmación y estado (descuento de primera compra)
├── cuenta/         registro, verificación (demo), historial
├── adaptadores/
│   └── odoo/       cliente JSON-RPC
├── pagos/          pago simulado; la pasarela real va aquí
└── ia/             (etapa posterior)
```

**Solo `adaptadores/odoo` sabe que Odoo existe.** Ningún otro módulo lo importa.
Si se cambia de POS, se reescribe esa carpeta y nada más.

## Manejo de errores

| Situación | Respuesta al comensal |
|---|---|
| Token de mesa inválido o revocado | "Esta mesa no está disponible" |
| Sin sesión de caja abierta | El sistema la abre; se alerta a operaciones |
| Producto agotado al confirmar | Se señala la línea y se deja ajustar el carrito |
| Odoo caído o sin responder | Se conserva el carrito y se reintenta; nunca se pierde |
| Confirmación duplicada | Se devuelve el mismo pedido (idempotencia por `uuid`) |

El principio: **el carrito nunca se pierde por un fallo de infraestructura.**
Vive en el bloque 3, así que sobrevive a una caída de Odoo.

## Pruebas

- **Unitarias** sobre el modelo de sesión y la atribución de líneas: los tres
  modos de pago (todo, lo mío, dividir) se calculan sobre los mismos datos.
- **De contrato** contra un Odoo real en contenedor, no contra un simulacro: el
  spike demostró que las sorpresas están en Odoo, no en nuestro código.
- **Casos límite verificados en el spike**: sin sesión de caja, confirmación
  duplicada, precios manipulados desde el cliente.

## Fuera de alcance en esta etapa

Frontend y PWA, Mesero IA, pasarelas de pago y facturación. Se construyen sobre
esta API, no dentro de ella.
