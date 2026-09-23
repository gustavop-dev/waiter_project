# Horario de reservas: semanal, con franjas y fechas especiales · 2026-09-20

## El fallo que lo destapó

No se podía reservar para un día distinto de hoy. `DateTimeModal` pintaba las franjas que el asistente ya tenía cargadas (las de hoy) y no las volvía a pedir al tocar otro día. De noche el servidor marca todas las de hoy como `past`, así que salían deshabilitadas también para mañana. De día el fallo no se notaba, por eso sobrevivió.

**Arreglo.** El modal recibe `loadSlots(date)` y pide las franjas del día que se toca; la hora elegida solo vale si ese día la ofrece. Los días pasados no se pueden elegir. Regresión: `pos/components/reservations/__tests__/DateTimeModal.test.tsx` (reloj fijado a las 23:30).

## El horario

Antes: un solo par `reservation_open`/`reservation_close` en `pos.config` (10:00–22:00), igual todos los días y sin pantalla para cambiarlo.

Ahora, con el modelo de cal.com (horario semanal + fechas especiales) en vez de reglas de repetición tipo Google Calendar: un restaurante repite por semana y tiene excepciones puntuales; un RRULE sería más difícil de editar y de validar sin dar nada a cambio.

`pos.config.reservation_schedule` (Json):

```json
{"weekly": {"0": [[12, 15], [18, 22.5]], "1": [], "…": []},
 "overrides": [{"date": "2026-12-24", "ranges": [[12, 16]], "note": "Nochebuena"}]}
```

- `weekly`: los siete días, `0` = lunes (como `date.weekday()`). Cero franjas = cerrado; hasta 4 por día.
- `overrides`: una fecha especial **reemplaza por completo** a su día de la semana (cierra un día que abre, o abre distinto uno que cierra).
- Horas decimales en medias horas; franjas ordenadas y sin pisarse (pegadas sí: 12–15 y 15–18).
- Vacío = el comportamiento anterior. `waiter_reservation_schedule()` siempre devuelve el horario completo, así que el editor no distingue «sin configurar».

`clean_schedule` (en `projectapp_reservations/models/pos_config.py`) valida y normaliza; también corre como `@api.constrains`, para que un `write` directo tampoco deje un horario imposible. El permiso es el de escribir `pos.config`, igual que el resto de Configuración.

## Una sola fuente: `pos.config.reservation_ranges(date)`

- **Franjas del asistente** (`waiter_slots`): las del día; un día cerrado devuelve `[]`.
- **Validación** (`_check_opening_hours`): una reserva activa debe empezar dentro de una franja de su día. Solo se dispara al crear o al cambiar fecha, hora o mesa: **acortar el horario no rompe las reservas que ya existían** (siguen pudiendo sentarse o cancelarse).
- **Línea de tiempo** (`waiter_timeline`): `cardPlacement` del POS ubica cada tarjeta por su distancia a la primera columna, así que necesita medias horas **contiguas**. `waiter_slots(span=…)` devuelve el tramo completo y marca `closed` lo que cae fuera del horario (el hueco entre almuerzo y cena se dibuja rayado). El tramo se ensancha para incluir reservas que quedaron fuera de un horario nuevo; un día cerrado y vacío usa el tramo habitual de la semana.

## Interfaz (Configuración → Horario de reservas)

`pos/components/settings/ReservationHoursForm.tsx`, reglas puras en `pos/lib/domain/reservationHours.ts`:

- Una fila por día: interruptor abierto/cerrado, franjas con selectores de inicio y fin, agregar franja (sugiere una hora después del último cierre), quitar, y **copiar a otros días**.
- «Así queda la semana»: una columna por día con un bloque por franja, para ver de golpe un día olvidado.
- Fechas especiales: por defecto cierran el día (lo habitual en un festivo); pueden llevar su propio horario y un motivo.
- Las franjas imposibles se nombran en su día y no dejan guardar; el editor nunca reordena ni «corrige» por su cuenta.
- En el asistente de reservas los días cerrados salen tachados y las horas de almuerzo y cena van separadas.

## Pruebas

Odoo (`tests/test_reservations.py`): franjas partidas y días cerrados, fecha especial sobre su día de la semana, reservas fuera de horario rechazadas sin romper las existentes, línea de tiempo contigua, horarios imposibles rechazados. Las pruebas ponen `reservation_schedule = False` en el `setUpClass`: corren sobre una copia de la base de desarrollo y el horario que alguien haya configurado ahí no puede decidir si pasan. La prueba del apartado de mesa dependía del reloj (reservaba «dentro de 4 h») y de madrugada caía fuera del horario: ahora abre el restaurante todo el día.

POS: `lib/domain/__tests__/reservationHours.test.ts`, `components/settings/__tests__/ReservationHoursForm.test.tsx`, `components/reservations/__tests__/DateTimeModal.test.tsx`.

## Antelación mínima y ventana máxima · 2026-09-20

Dentro del mismo Json: `"rules": {"minNotice": 120, "maxDays": 60}` (minutos y días; `0` = sin límite). Un horario guardado antes de existir las reglas se lee como `0/0`. `clean_rules` valida (medias horas, hasta 7 días de antelación; hasta 730 días de ventana).

- **Franjas** (`waiter_slots`): `soon` marca las horas que aún no pasaron pero ya no cumplen la antelación. Se calcula contra la fecha y hora reales, así que una antelación de 24 h bloquea también las horas de mañana que correspondan. Más allá de la ventana el día no ofrece horas.
- **Validación** (`_check_booking_rules`): se revisa en `create` y en `write` **solo si cambian fecha u hora**. Cambiar mesa o estado de una reserva cercana no es «reservar de nuevo» y no se rechaza. Por eso no es un `@api.constrains` (que también saltaría al cambiar la mesa).
- **Aplica a todos**, también al personal: hoy no hay otra vía de reserva, y una regla que el POS pudiera saltarse no haría nada visible. Si algún día el comensal reserva solo, se puede relajar para el personal.
- En el selector de fecha las horas `soon` salen deshabilitadas y los días fuera de la ventana no se pueden tocar.
- Todo usa la zona horaria del usuario de Odoo (`_waiter_tz`), igual que `past`. Ojo al probar de noche: con el servidor en UTC y el usuario en Bogotá, «hoy» es el día de Bogotá.

## Varias mesas por reserva · 2026-09-20

Un grupo grande junta mesas. `waiter.reservation.table_ids` (Many2many) son **todas** las mesas que aparta; `table_id` se conserva como **mesa principal** (ahí va el pre-pedido y sigue siendo requerida), siempre dentro de `table_ids`. Así todo lo anterior sigue funcionando y una reserva de una sola mesa es el caso `table_ids = [table_id]`.

- `_waiter_fill_tables` mantiene la coherencia en `create`/`write`: se puede mandar solo la principal, solo la lista (la primera pasa a principal) o ambas. Cambiar solo la principal de una reserva existente la **sustituye** dentro de sus mesas sin soltar las demás. Una reserva sin mesas se rechaza.
- `init()` rellena `table_ids` de las reservas anteriores (idempotente; corre en cada actualización del módulo).
- Choques (`_overlap_domain`), disponibilidad, línea de tiempo (la tarjeta aparece en la fila de **cada** mesa) y el «Reservada» del plano (`waiter_reserved_at`) miran `table_ids`.
- `projectapp_ops` impide retirar una mesa o un piso con reservas futuras: ahora también si la mesa es **secundaria** de un grupo (`reservation_tables_field`).
- Payloads: `table_ids`, `table_numbers` (principal primero), `seats` en la tarjeta; `tables` en el detalle; `table_numbers` en el público del enlace de pago (el menú del comensal dice «Mesas 2 y 5»). El correo de confirmación lista todas; la plantilla es `noupdate`, así que **en una base ya instalada hay que actualizar el registro a mano** (hecho en desarrollo).
- El servidor **no** exige que los puestos alcancen para el grupo (tampoco lo exigía antes): lo guía la interfaz.

**Interfaz.** En el paso «Mesa» se tocan una o varias mesas libres, también de pisos distintos. La barra inferior suma puestos («Faltan 3 puestos: van 4 de 7») y no deja continuar hasta que el grupo quepa. Una mesa que sola no sienta al grupo ya no sale bloqueada: se puede juntar. Como los números de mesa se repiten entre pisos, si la selección cruza pisos cada ficha y el resumen dicen el piso.

Dos fallos que solo se vieron probando en el navegador: el encabezado decía «Ninguna mesa libre» con todo el piso libre (contaba con la regla vieja), y el detalle de una reserva de grupo pintaba la clave `reservations.detail.tablesLabel` (las etiquetas estaban en el bloque equivocado; next-intl no lanza, pinta la ruta). Ambos tienen prueba.

### Cambiar las mesas de una reserva ya creada

Desde el detalle de una reserva **confirmada** (pantalla Reservas): «Cambiar mesas» abre el mismo plano y el mismo contador de puestos del asistente (`ReservationTablesEditor` reutiliza `TableStep`), con las mesas actuales ya marcadas. Se puede quitar, sumar o mover, también entre pisos.

- `waiter_available_tables(..., exclude_id=<reserva>)`: sin eso sus propias mesas saldrían «reservadas» y no podría conservarlas.
- `waiter_set_tables(table_ids)`: solo reservas confirmadas (una ya sentada es «mover un pedido de mesa», otro flujo); la primera de la lista queda como principal y el **pre-pedido en borrador la sigue**. Que las mesas nuevas estén libres lo decide `_check_overlap`.
- `_check_opening_hours` dejó de dispararse con `table_id`: si el horario se acortó después de crear la reserva, cambiarle la mesa no debe rechazarse por la hora.
- El detalle que abre el **salón** (`components/tables/ReservationDetailModal`) no ofrece el cambio: ahí no hay terminal en contexto y el flujo natural es la pantalla de Reservas.

Que las mesas juntadas estén contiguas **no se comprueba a propósito**: lo decide quien reserva mirando el plano.

## Pendiente (a propósito)

- **Duración y cupo por franja**: la disponibilidad sigue siendo por mesa, no por aforo.
- El horario es de **reservas**, no de atención del local; si más adelante el menú del comensal necesita «abierto/cerrado», conviene que parta de este mismo modelo.
