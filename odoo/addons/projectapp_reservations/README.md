# projectapp_reservations

Addon **sin interfaz** para el módulo Reservas del kit CloudPos (`pos/` → `lib/services/reservations.ts`).
Odoo 19 Community no trae reservas de restaurante (`appointment` es Enterprise), así que este addon
aporta `waiter.reservation`, el horario de reservas del `pos.config` y la "próxima reserva" de cada mesa
para el plano. Instalación: `-i projectapp_reservations` (depende de `pos_restaurant` y `mail`).

## Modelo `waiter.reservation`

| Campo | Tipo | Regla |
|---|---|---|
| `name` | Char | Secuencia `RV001`, `RV002`… (`ir.sequence` código `waiter.reservation`). |
| `customer_name` | Char, obligatorio | |
| `customer_email`, `customer_phone` | Char | Con correo se envía la confirmación. |
| `date` | Date, obligatorio | Día de la reserva. |
| `time_start` | Float, obligatorio | Horas; solo franjas de 30 min (17.5 = 17:30). |
| `time_end` | Float, obligatorio | Por defecto `time_start + 1.5`. |
| `people` | Integer | ≥ 1, por defecto 2. |
| `baby_chair` | Boolean | Silla de bebé. |
| `table_id` | Many2one `restaurant.table`, obligatorio | |
| `floor_id` | related `table_id.floor_id` (almacenado) | |
| `state` | Selection | `confirmed` (defecto) · `seated` · `no_show` · `cancelled`. |
| `notes` | Text | |
| `preorder_id` | Many2one `pos.order` | Borrador Dine In con los platos pre-pedidos; opcional. |
| `amount_total`, `currency_id` | related del pre-pedido | Total del pre-pedido. |

Reglas: no hay dos reservas activas (`confirmed` o `seated`) en la misma mesa con franjas solapadas
(`ValidationError`); la hora de inicio cae en una franja de 30 min; fin > inicio dentro del día.

## API para el POS (`call_kw`)

| Llamada | Devuelve |
|---|---|
| `waiter.reservation.waiter_slots(config_id, date=None)` | `[{"time": 10.0, "label": "10:00", "past": false}, …]` entre `pos.config.reservation_open` y `reservation_close` (10 y 22 por defecto) cada 30 min; `past` solo se enciende para hoy. |
| `waiter.reservation.waiter_available_tables(config_id, date, time_start, people, time_end=None, include_unavailable=False)` | Mesas activas del punto de venta sin solape y con `seats >= people`: `{id, table_number, name, seats, floor_id, floor_name, shape, status, available, reserved_at, reservation}`. Con `include_unavailable=True` vienen todas con `status` = `available` · `reserved` · `unavailable` (leyenda del kit) y `reserved_at` ("17:00") de la reserva que choca. |
| `waiter.reservation.waiter_create(vals, lines=None)` | Crea la reserva (y con `lines` el `pos.order` borrador con preset Dine In, `table_id`, `customer_count` y `preset_time` = fecha y hora de la reserva) y devuelve el detalle. `vals` admite `config_id`; si falta se usa el punto de venta del piso de la mesa. `lines`: `[{"product_id": <product.product>` o `"product_tmpl_id": <product.template>, "qty": 1, "note": ""}]`. Exige caja abierta (`UserError` si no). |
| `waiter.reservation.waiter_timeline(config_id, date, floor_id=None)` | `{date, slots, floors: [{id, name}], tables: [{…mesa, reservations: [tarjeta…]}]}` para la grilla mesa × franja. |
| `waiter.reservation.waiter_detail()` (sobre ids) | Lista de detalles: tarjeta + `customer_email`, `customer_phone`, `notes`, `table`, `preorder_id`, `preorder_state`, `amount_total`, `currency_id`, `lines: [{id, product_id, product_tmpl_id, name, qty, price_unit, price_subtotal, price_subtotal_incl, note}]`. |
| `waiter.reservation.action_seated()` | `confirmed → seated`; el pre-pedido pierde `preset_time` (aparece en la sesión) y, si su sesión cerró, pasa a la sesión abierta. |
| `waiter.reservation.action_no_show()` / `action_cancel()` | Desde `confirmed` o `seated`; el pre-pedido en borrador pasa a `cancel`. |
| `restaurant.table.waiter_reserved_at(date=None)` (sobre ids) | `{table_id: tarjeta | false}` con la próxima reserva confirmada del día (para hoy, la que aún no terminó). Por RPC las claves llegan como texto. |

Tarjeta de reserva: `{id, name, customer_name, people, baby_chair, state, date, time_start, time_end,
label ("12:00"), time_label ("12:00 – 13:30"), table_id, table_number, floor_id, floor_name}`.

## `pos.config`

`reservation_open` (Float, 10.0) y `reservation_close` (Float, 22.0): horario de reservas; constraint
`0 ≤ apertura < cierre ≤ 24`.

## Correo de confirmación

Plantilla `projectapp_reservations.mail_template_reservation_confirmed` (`mail.template`, en español):
código, fecha, hora, mesa, personas, silla de bebé, platos pre-pedidos y total. Se encola como
`mail.mail` al crear una reserva con `customer_email` (`waiter_create` lo manda después del pre-pedido
para que el correo lo incluya). El envío real depende del servidor SMTP (`odoo/provisioning/configure-mail.sh`).

## Pre-pedido y cierre de caja

El `pos.order` borrador lleva `preset_time` = fecha y hora de la reserva. Odoo excluye del cierre los
borradores con `preset_time` futuro, así que una reserva de mañana no bloquea la caja de hoy. Al sentar
al cliente `preset_time` se limpia y el pedido sigue en el POS como cualquier otro. Cancelar o marcar
no-show anula el borrador.

## Pruebas

`tests/test_reservations.py` (runner de Odoo): solape rechazado, franjas y mesas disponibles, creación
con pre-pedido y correo, timeline y `waiter_reserved_at`, acciones de estado.

```
odoo -d projectapp -u projectapp_reservations --test-enable --test-tags /projectapp_reservations --stop-after-init
```
