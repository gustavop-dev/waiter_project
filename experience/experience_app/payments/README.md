# pagos (etapa posterior)

Hoy `confirmar` envía el pedido a Odoo y a cocina. Cuando exista pasarela
(Wompi / Bold / Nequi: decisión pendiente en la arquitectura), `confirmar`
pasa a *reservar* y el envío a Odoo ocurre al evento `pago aprobado`, que
además registra el pago (`pos.order.add_payment` + `action_pos_order_paid`,
ya portados en `adapters/odoo/pos.py`) y dispara facturación (bloque 2).
