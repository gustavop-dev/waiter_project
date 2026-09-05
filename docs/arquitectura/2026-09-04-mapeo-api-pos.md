# Mapeo: pantallas del POS propio → API de Odoo

- **Fecha:** 2026-09-04
- **Todo lo listado está verificado contra Odoo 19 Community por JSON-RPC**
  (`/web/dataset/call_kw`), salvo lo marcado *[existe, no probado]*.
- **Depende de:** [frontend propio para el POS](../decisiones/2026-09-04-pos-frontend-propio.md)

## Transporte

```
POST /web/session/authenticate   {db, login, password}   → cookie session_id
POST /web/dataset/call_kw        {model, method, args, kwargs}
```

`kwargs.context.lang = "es_CO"` para etiquetas traducidas.
Cuando un método devuelve `None`, la respuesta **no trae la clave `result`**
(`{"jsonrpc":"2.0","id":1}`). No es error. Tratar `result` como opcional.

## Arranque de la app (todas las pantallas)

| Paso | Llamada | Devuelve |
|---|---|---|
| Sesión de caja activa | `pos.session.search_read([[state in (opened, opening_control)]])` | id, config_id |
| **Todo el POS de una vez** | `pos.session.load_data([sid], [])` | 49 modelos: productos, categorías, impuestos, mesas, pisos, métodos de pago, presets, notas… |
| Esquema (opcional) | `pos.session.load_data_params([sid])` | campos y relaciones por modelo |

`load_data` acepta una lista de modelos para cargar solo algunos. Con `[]`
carga todos.

### Trampa: la sesión de caja

Sin sesión abierta no hay pedidos. **La abre el sistema**, no el mesero:

```python
pos.session.create({config_id, user_id}) → action_pos_session_open()
```

## Pantalla 1 · Plano de salón

| Necesita | De dónde |
|---|---|
| Pisos y mesas | `load_data` → `restaurant.floor`, `restaurant.table` (id, table_number, floor_id, seats, position_h/v) |
| Pedidos abiertos por mesa | `pos.order.search_read([[state=draft, session_id=sid]], [table_id, amount_total, ...])` |
| Estado de cada mesa | **Se deriva en el cliente**: sin pedido → libre; draft → ocupada; con algún curso disparado sin `ready_date` → en cocina; todos los cursos con `served_date` → servido; pagado → cerrar. Los cursos se leen con `restaurant.order.course.search_read` filtrando por `order_id.session_id`. |

**Brecha:** los 9 estados del sistema de diseño no existen en Odoo. Odoo solo
sabe *libre / con pedido / pagado*. «Pidiendo», «servido», «asistencia» son
estado nuestro, del registro central o del bloque 3.

## Pantalla 1c · KDS de cocina (Plan B, verificado 2026-09-05)

| Acción | Llamada |
|---|---|
| Comandas vivas | `restaurant.order.course.search_read([[fired,=,true],[served_date,=,false],[order_id.state,=,draft],[order_id.session_id,=,sid]], [order_id, fired_date, ready_date, served_date])` |
| Líneas de esas comandas | `pos.order.line.search_read([[course_id,in,ids]], [course_id, full_product_name, qty, customer_note, product_id])` |
| Mesa, mesero y número | `pos.order.read(ids, [table_id, user_id, tracking_number])` (`tracking_number` solo lo pone la UI de Odoo; headless llega `False` y se muestra el id) |
| Estación de una línea | en cliente: `product → pos_categ_ids → pos.category.kitchen_station` (campo del addon, expuesto en `load_data`) |
| Listo / Entregado | `restaurant.order.course.action_kitchen_ready([[id]])` / `action_kitchen_served([[id]])` — hora del servidor |
| Tiempo medio del turno | cursos con `ready_date` de la sesión; media de `ready_date − fired_date` en cliente |

Sondeo cada 5 s (tres llamadas). Sin bus: Odoo Community no lo expone a
terceros sin módulo propio; queda diferido.

## Pantalla 2 · Toma de pedido

| Acción | Llamada |
|---|---|
| Catálogo | ya en memoria desde `load_data` (`product.product`, `pos.category`, `product.attribute`, `product.combo`) |
| Crear / actualizar pedido | `pos.order.sync_from_ui([[orden]])` |
| **Recalcular totales** | `pos.order.recompute_prices([[id]])` |
| Enviar a cocina | `restaurant.order.course.kitchen_fire(order_id, line_ids)` (addon `projectapp_kitchen`): crea un curso con `fired=True` y hora del servidor para las líneas sin curso. **Verificado**: las líneas conservan su curso tras un nuevo `sync_from_ui`. |

### Forma mínima de la orden (verificada)

```json
{
  "id": -1, "uuid": "<uuid4>", "session_id": 1, "table_id": 6,
  "customer_count": 2, "sequence_number": 1, "state": "draft",
  "amount_total": 0, "amount_tax": 0, "amount_paid": 0, "amount_return": 0,
  "date_order": "2026-09-04 22:00:00",
  "lines": [[0, 0, {
    "product_id": 3, "qty": 2, "price_unit": 36900,
    "tax_ids": [[6, 0, [<ids de taxes_id del producto>]]],
    "price_subtotal": 0, "price_subtotal_incl": 0,
    "full_product_name": "Hamburguesa Angus",
    "customer_note": "termino medio",
    "uuid": "<uuid4>", "id": -1
  }]]
}
```

### Trampa: `sync_from_ui` NO recalcula precios

Por la API cruda el pedido se crea con **`amount_total = 0`**. En el spike
funcionaba porque el controlador de self-order llamaba `recompute_prices()`
después. **El cliente debe llamarlo siempre tras `sync_from_ui`.** Verificado:
0 → 87.822.

### Idempotencia

Odoo busca el pedido por `uuid` (`_get_open_order`). Reenviar la misma orden con
el mismo `uuid` **actualiza** en vez de duplicar. El cliente genera el `uuid`
una vez y lo reutiliza en reintentos. Las líneas también llevan `uuid`.

### Modificadores

`product.attribute` / `product.template.attribute.value` vienen en `load_data`.
En la línea van como `attribute_value_ids`. Las notas libres («sin cebolla») en
`customer_note`.

## Pantalla 3 · Cobro

| Acción | Llamada |
|---|---|
| Métodos de pago | `load_data` → `pos.payment.method` (id, name, **type**) |
| Registrar pago | `pos.order.add_payment([[oid], {pos_order_id, payment_method_id, amount}])` |
| Total pagado | `pos.order.read([[oid], [amount_paid, amount_total]])` |
| Cerrar | `pos.order.action_pos_order_paid([[oid]])` → `state = paid` |
| Propina | campos `is_tipped`, `tip_amount` en la orden *[existe, no probado]* |
| Dividir cuenta | varios pedidos sobre la misma `table_id`, o `add_payment` parcial repetido *[por diseñar]* |

### Trampa: `type` no es campo almacenado

`pos.payment.method.type` no se puede usar en un dominio de `search_read`
(«Cannot convert ... to SQL»). Pedirlo en `fields` y filtrar en el cliente.

### Trampa: `add_payment` devuelve `None`

La respuesta llega sin `result`. Comprobar el pago releyendo `amount_paid`.

## Pantalla 4 · Recibo

| Acción | Llamada |
|---|---|
| Datos del recibo | `pos.order.read` + `pos.payment` + `res.company` (ya en `load_data`) |
| Enviar por correo | `pos.order.action_send_receipt(email, ticket_image, basic_image)` *[existe, no probado]* |
| Factura | `pos.order.action_pos_order_invoice()` *[existe, no probado]* — para DIAN va el bloque 2 |

**El recibo lo renderiza el cliente.** Odoo solo da los datos.

## Tiempo real

`pos.bus.mixin._notify(nombre, mensaje)` publica en `bus.bus` en un canal
ligado a la configuración de POS y su `access_token`. Eventos vistos en el
código: `STATUS`, `CLOSING_SESSION`; el resto queda por enumerar. El cliente se
suscribe por websocket (`/websocket`, puerto 8072 en el compose) o hace polling
de `pos.order` por `write_date`.

## Otras trampas conocidas

- **Activar un idioma exige reiniciar el worker** (`env.lang` es
  `cached_property`), o los pedidos fallan con `Invalid language code`.
- **`restaurant.table.identifier` no tiene unicidad** y Odoo lo busca en toda
  la base con `limit=1`. El token público es del registro central, no de Odoo.
- **La sesión de caja debe estar abierta** para que exista `session_id`.
