# Plan E — Cierre del POS · Partes 1 a 4: cobro, caja, roles y remates

> **Para agentes:** ejecutar tarea por tarea, con el ciclo completo (test que
> falla → implementación mínima → test que pasa → commit).

**Objetivo:** que una cuenta se pueda cobrar como en un restaurante real:
método de pago (efectivo, datáfono, cuenta de cliente), **pagos mixtos**,
cambio en efectivo, **propina** real, **división** en partes iguales y
**recibo** en pantalla listo para imprimir. El datáfono es **manual** por
decisión del usuario (2026-09-05): el cajero digita el monto en el datáfono y
confirma aquí; queda un adaptador `terminal` con la interfaz fija para que la
semi-integración (Bold es la candidata con API) entre sin tocar la pantalla.
Además `pos/` pasa a ser **PWA instalable** (sin offline todavía).

**Arquitectura:** el dominio `lib/domain/payment.ts` calcula propina, partes,
restante y cambio sin I/O; `lib/services/orders.ts` gana `addTip`, `setChange`
y sigue usando `add_payment` (uno por pago) + `action_pos_order_paid`;
`orderStore.settle` orquesta; `components/pay/` pinta el panel de cobro y el
recibo. La propina en Odoo es una línea del producto de propina de
`pos.config.tip_product_id` (verificado: no existe `set_tip` en 19), más
`tip_amount` / `is_tipped`.

**Fuera:** dividir por líneas (crea pedidos separados en Odoo; llega con la
atribución por comensal de la PWA), impresión térmica (se imprime desde el
navegador), modo offline, semi-integración de datáfono.

## Tareas
1. ✅ Dominio de pago + servicios (`addTip`, `setChange`, `Settings.tipProductId`) + contrato real (propina + dos pagos + cambio + cierre).
2. ✅ `orderStore.settle` y adaptador `terminal` manual.
3. ✅ Panel de cobro (`PayPanel`): propina, partes, pagos mixtos, datáfono manual, cambio; recibo con impresión.
4. ✅ PWA: manifest, service worker mínimo, iconos; rail con Pedidos y Pagos enlazados.
5. ✅ E2E actualizadas al nuevo flujo + docs.

## Parte 2 — Apertura y cierre de caja con arqueo (2026-09-05)

- `/caja` (fuera del gate): sin caja abierta la app lleva aquí, no al login.
  Efectivo inicial y notas → `pos.session` + `set_opening_control`.
- En Ventas: tarjeta de caja (abierta desde, efectivo esperado), entradas y
  salidas de efectivo (`try_cash_in_out`, exige `extras.translatedType`), y
  **Cerrar caja**: `get_closing_control_data` (ventas, por método, apertura,
  movimientos), efectivo contado → diferencia con tolerancia de 500 COP,
  notas, `post_closing_cash_details` + `close_session_from_ui`. Las cuentas
  abiertas bloquean el cierre con aviso.
- Si Odoo detecta un descuadre contable devuelve el asistente «Forzar el
  cierre»; hoy se muestra su mensaje y no se fuerza (queda para roles: solo
  administrador).

## Parte 3 — Roles y permisos (2026-09-05)

- Rol en Odoo: `res.users.waiter_role` (mesero / cajero / administrador) en
  el addon `projectapp_ops`, **sincronizado con los grupos** de Odoo al crear
  o cambiar (POS usuario / administrador, facturación, productos, inventario).
  Así la app y la API nunca se contradicen.
- La app lee el rol al iniciar sesión (campo autorizado en
  `SELF_READABLE_FIELDS`). Sidebar y rail muestran solo lo del rol; una ruta
  ajena devuelve al salón sin pantalla de error.
- Mesero: salón, pedido, cocina, en vivo, clientes. Cajero: + caja, ventas,
  facturación. Administrador: todo, y **forzar cierre** de caja cuando Odoo
  detecta un descuadre (usa su asistente, que contabiliza la diferencia).
- Configuración → Usuarios: rol al crear y cambio de rol por usuario.
- Demo: `sofia` (mesero), `julian` (cajero), clave `Waiter-2026`.

## Parte 4 — Remates de la toma de pedido y del salón (2026-09-05)

- **Buscar plato** en la toma de pedido (filtra la carta junto con la categoría).
- **Nota general a cocina** en el pedido: viaja en `general_customer_note` y
  el KDS la muestra resaltada (y marca el ticket como *Atención*). Las notas
  de línea usan el mismo diálogo táctil; adiós al `prompt` del navegador.
- **Fotos de producto**: la tarjeta muestra la imagen de Odoo (`web/image`
  por el proxy same-origin) cuando existe; Catálogo permite subirla.
- **Buscar mesa o pedido** en el salón (número de mesa, número de pedido o
  mesero) y **Nueva mesa** en el piso activo.

Con esto el POS del operador queda cerrado. Fuera, por decisión: modo offline,
impresión térmica, modificadores por atributo y combos, semi-integración de
datáfono, "mesa pide mesero" (llega con la PWA).
