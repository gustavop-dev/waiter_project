# Plan: POS propio sobre la API de Odoo

- **Fecha:** 2026-09-04
- **Estado:** borrador — **las tareas de interfaz esperan el diseño**
- **Base:** [mapeo de API](../arquitectura/2026-09-04-mapeo-api-pos.md)

## Principio

Todo lo que **no depende del diseño** se construye y se prueba primero contra
un Odoo real en contenedor. La interfaz llega después y se enchufa a una capa
de datos ya verificada. Así el diseño no espera al backend ni el backend al
diseño.

## Fase 0 · Decisiones (bloquean la fase 2)

- [ ] Modo sin conexión: sí / no
- [ ] Alcance inicial: 4 pantallas / 10
- [ ] Stack del frontend (con el diseño en la mano)

## Fase 1 · Capa de datos (no depende del diseño) — empieza ya

1. **Cliente JSON-RPC** con sesión, reintentos y `result` opcional.
2. **`cargarPos()`**: `load_data` → estado tipado en memoria (productos,
   categorías, impuestos, mesas, métodos de pago).
3. **Modelo de pedido en cliente**: líneas, modificadores, notas, `uuid` por
   pedido y por línea.
4. **`guardarPedido()`**: `sync_from_ui` + `recompute_prices` +
   relectura. Idempotente por `uuid`.
5. **`cobrar()`**: `add_payment` (parcial repetible) + `action_pos_order_paid`.
6. **Derivación de estado de mesa** desde pedidos abiertos.
7. **Apertura de sesión por el sistema.**
8. **Pruebas de contrato contra Odoo real**: los cuatro pasos del flujo del
   cajero, la idempotencia, y cada trampa del mapeo como caso explícito.

## Fase 2 · Interfaz (espera el diseño)

Por pantalla, en este orden — horas de uso por turno, no dificultad:

1. Plano de salón
2. Toma de pedido
3. Cobro
4. Recibo

Cada pantalla se conecta a la capa de la fase 1, que ya está probada.

## Fase 3 · Operación

- Tiempo real por bus de Odoo
- Comanda impresa (`pos.printer`) o KDS propio
- Sin conexión, si la fase 0 dijo sí

## Fuera de este plan

Backoffice de administración (productos, mesas, precios): sigue en Odoo, con
`projectapp_ui` y `projectapp_pos_design` como transición, hasta que la
interfaz propia lo cubra.
