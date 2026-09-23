# Pago del comensal

Estado del Plan H: demo sin cobro real. El cliente llama a `confirmar/` antes de
`pago/simulado/`; confirmar guarda el pedido en Odoo y lo envía a cocina. Si falla,
no se llama al pago. El endpoint simulado exige pedido enviado y ningún plato abierto;
recibe método y opción de reparto (`all`, `mine`, `parts`), calcula el importe en el
servidor e ignora cualquier `monto` enviado por el navegador.

No crea `pos.payment`, no marca pagada la sesión y no emite factura. El POS sigue
cobrando la mesa. El registro del log y la referencia `DEMO-*` no son conciliación.
`DINER_DEMO_ENABLED=false` lo deshabilita; producción siempre responde 503.

La futura pasarela requiere un contrato propio de reserva, autorización, idempotencia,
webhook, conciliación y devolución. Al aprobar un pago real, el bloque 3 registrará el
pago en Odoo y emitirá el evento para facturación. Cambiar el momento de envío a cocina
requiere una decisión explícita: no es el comportamiento implementado de H.

Detalle y pruebas: [informe del PR #14](../../../docs/revisiones/2026-09-05-cierre-H-pr14.md).
