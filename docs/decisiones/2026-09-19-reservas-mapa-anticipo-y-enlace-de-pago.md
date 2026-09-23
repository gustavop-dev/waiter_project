# Reservas: el mismo plano, platos opcionales, costo de la reserva y enlace de pago

## El mismo plano en los tres sitios

El paso «Mesa» del asistente de reservas ya no es una rejilla de tarjetas sueltas: es `FloorPlan`, el mismo componente del
salón, alimentado con `waiter_read_plan` como el editor. Paredes con su color, zonas, imágenes de referencia, encuadre y
centrado son idénticos. La disponibilidad la sigue decidiendo el servidor (`waiter_available_tables`); el plano solo la
dibuja: libre se elige, reservada a esa hora muestra desde cuándo, y la que no alcanza para el grupo sale atenuada
(`blockedIds`). Con varios pisos se abre en el primero que tenga una mesa libre para ese grupo.

## Platos opcionales

El servidor ya aceptaba reservas sin platos; el bloqueo era del panel del carrito, compartido con «Crear pedido». Ese panel
recibe ahora `emptyLabel`: solo el asistente de reservas lo pasa («Continuar sin platos»). Crear pedido sigue exigiendo platos.
Una reserva sin platos no crea ningún `pos.order`, así que tampoco necesita la caja abierta.

## Costo de la reserva

`waiter.reservation` gana `deposit_amount`, `deposit_state` (none · pending · paid), `deposit_reference`, `deposit_paid_at` y
`pay_token`. En el resumen el costo viene **activo**: cobrar el anticipo es lo normal y quitarlo es una acción explícita
(«Quitar el costo»). Un costo activo y vacío no deja crear la reserva: así nadie envía un enlace por cero pesos. El estado y el
token los fija el servidor al crear, nunca quien llama. Antes del pago se puede cambiar o quitar el costo
(`waiter_set_deposit`) o registrar un pago hecho por fuera (`waiter_mark_deposit_paid`); después de pagado no se toca.

## Enlace de pago

Odoo arma el enlace con los mismos parámetros que usa Diseño del menú (`projectapp.diner_url`, restaurante y sede):
`<menú>/<restaurante>/<sede>/reserva/<token>`. El token (24 bytes aleatorios, único) es la llave: no hay cookie ni cuenta.
Al crear una reserva con anticipo se abre su detalle con el enlace listo para **copiar**, enviar por **WhatsApp** (mensaje
armado, indicativo 57 para celulares colombianos) o por **correo**.

La página vive en el menú del comensal y hereda su sistema de diseño y la marca del restaurante: logo, nombre, un tiquete con
fecha, hora, personas y mesa, el monto y los medios de Wompi. Quien abre el enlace ve lo justo para reconocer su reserva: primer
nombre, nunca correo, teléfono ni notas (`waiter_deposit_public`). Sin pasarela habilitada no se enseñan medios ni botón de pagar;
se explica a quién escribir. Con el anticipo pagado, la reserva cancelada o sin costo, no se ofrece cobrar.

## Pago: la misma maquinaria que la cuenta

`PaymentAttempt` paga ahora una de dos cosas, y una restricción de base lo exige: la cuenta de una visita (sesión, comensal,
pedido) o el anticipo de una reserva (`reservation_token`). Todo lo delicado es compartido (`online_payments.submit`,
`apply_remote`, `refresh`, webhook): intento durable antes de llamar a Wompi, un solo intento vivo por reserva, resultado incierto
que no reintenta el cobro, verificación por consulta autenticada. El monto lo dice Odoo; el navegador lo envía solo como
precondición. La interfaz también se comparte: `OnlinePayPanel` recibe un adaptador (de dónde salen los datos) y los textos.

Una aprobación de **producción** llama `waiter_deposit_paid(token, monto, referencia)`: idempotente por referencia, exige el monto
exacto y bloquea la fila. Una aprobación de **sandbox** no marca pagada la reserva, igual que no paga cuentas del POS.

Endpoints de Experience: `GET/POST /api/v1/<rest>/<sede>/reservas/<token>/pagos/` y `GET/DELETE …/pagos/<uuid>/`.

## Pendiente, a propósito

- El anticipo queda registrado en la reserva, no en la contabilidad: no crea un `pos.payment` ni se descuenta solo de la cuenta del
  día de la visita. Eso necesita decidir cómo se abona (producto «Anticipo», saldo a favor) y va en una entrega aparte.
- Cancelar una reserva con anticipo pagado no reembolsa: se gestiona por fuera.
- Falta probar contra el sandbox real de Wompi: siguen faltando las credenciales (ver `planes/2026-09-14-wompi.md`).

## Verificación

Odoo en copia aislada: 12 pruebas de reservas (4 nuevas: sin platos, enlace secreto y datos públicos, conciliación idempotente,
cambiar/quitar/registrar a mano). Experience: 10 pruebas nuevas del anticipo más las 35 de pagos existentes. POS: dominio, paso de
mesa sobre el plano, resumen con costo, panel de compartir. Comensal: ruta, página, estados sin cobro y las 8 del pago de la cuenta
tras extraer el panel. Navegador real: asistente completo sin platos, reserva RV101 con anticipo, enlace abierto en 390 px contra
Odoo y Experience reales, y el estado con pasarela con la respuesta de la API interceptada (sin cobros).
Respaldos: `/tmp/waiter-dev/backups/projectapp-before-reservation-deposit-20260919.dump` y
`experience-before-reservation-deposit-20260919.sqlite3`. Migración Experience `0023_reservation_deposit_payments`.
