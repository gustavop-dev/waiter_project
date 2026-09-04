# Decisión: frontend propio para el POS, Odoo solo como backend

- **Fecha:** 2026-09-04
- **Estado:** aceptada
- **Reemplaza a:** rediseñar el POS de Odoo con `t-inherit` (descartado)

## Decisión

**No se rediseña la interfaz del POS de Odoo. Se construye una propia** para
mesero y cajero, que habla con Odoo por su API externa JSON-RPC. Odoo queda
como motor de datos, precios, impuestos y contabilidad. Nadie ve su interfaz.

Extiende al operador la misma decisión ya tomada para el comensal (bloque 3).

## Por qué

**El backend del POS de Odoo ya está diseñado como API para un cliente.** Su
frontend OWL es solo un consumidor más. Verificado por la API externa, sin
tocar su interfaz:

| Capacidad | Método | Verificado |
|---|---|---|
| Cargar todo el POS en una llamada | `pos.session.load_data([])` → 49 modelos | ✅ |
| Esquema de campos y relaciones | `pos.session.load_data_params()` | ✅ |
| Crear/actualizar pedido | `pos.order.sync_from_ui([orden])` | ✅ mesa 5 |
| Precios e impuestos en servidor | `pos.order.recompute_prices()` | ✅ IVA 19% |
| Registrar pago | `pos.order.add_payment(data)` | ✅ |
| Cerrar como pagado | `pos.order.action_pos_order_paid()` | ✅ `state=paid` |
| Facturar, anular, devolver | `action_pos_order_invoice`, `_cancel`, `refund` | existen |
| Tiempo real entre dispositivos | `pos.bus.mixin._notify` → `bus.bus` | existe |

**Los impuestos se calculan en el servidor** con `account.tax.compute_all()`.
No se reimplementa motor fiscal ni se puede equivocar un total en el cliente.

## Por qué no `t-inherit`

El techo de calidad visual del POS de Odoo lo pone su marcado, no el diseño.
Reemplazar pantallas con `t-inherit-mode="primary"` exige reescribir el OWL
manteniendo props, estado, eventos y store enganchados, y revalidarlo en cada
versión de Odoo. El sistema de diseño Waiter no cabe en ese marcado sin pelear
con él en cada pantalla.

## Lo que hay que construir (las ~11.400 líneas de JS de Odoo hacen esto)

1. **Máquina de estados del pedido en el cliente.**
2. **Sincronización en vivo entre dispositivos**: suscripción al bus de Odoo.
3. **Modo sin conexión** — *decisión pendiente*. Odoo trae service worker. Sin
   él, un wifi caído para la caja en hora pico.
4. **Hardware**: impresora de comandas y cajón. Ya era nuestro: el IoT de Odoo
   es Enterprise.

## Consecuencias

- Los módulos `projectapp_ui` y `projectapp_pos_design` pasan a ser
  **transitorios**: sirven mientras alguien entre al backoffice de Odoo. Se
  eliminan cuando la interfaz propia cubra la administración.
- La API externa (`rpc`, `/web/dataset/call_kw`) es el contrato. Un usuario de
  servicio por inquilino, nunca `admin`.

## Decisiones pendientes

- **Sin conexión: sí o no.** Cambia la arquitectura del cliente.
- **Alcance inicial**: cuatro pantallas (salón, pedido, cobro, recibo) o las
  diez.
- **Stack del frontend**: se decide con el diseño en la mano.
