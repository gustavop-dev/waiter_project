# Plan E — Cierre del POS · Parte 1: cobro completo

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

Siguientes partes del Plan E (no en este PR): apertura y cierre de caja con
arqueo; roles y permisos; buscar plato, nota general, fotos; buscar mesa.
