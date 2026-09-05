# Bloque 3 — Experiencia del comensal

- **Fecha:** 2026-09-04
- **Estado:** backend implementado el 2026-09-05 (`experience/`, Plan D); pagos, IA y PWA pendientes
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
POST /api/v1/sesiones/<id>/llamar         el comensal llama al mesero (llega al salón por Odoo)
POST /api/v1/sesiones/<id>/cuenta         pide la cuenta: todo / lo mío / dividir
```

## Estructura

```text
experience/
├── catalogo/       carta normalizada + caché por sede
├── sesiones/       sesión de mesa, comensales, carrito
├── pedidos/        confirmación y estado
├── adaptadores/
│   └── odoo/       cliente JSON-RPC
├── pagos/          (etapa posterior)
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
