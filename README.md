# waiter_project — ProjectApp Smart Restaurant

SaaS para restaurantes que automatiza la atención en mesa: el comensal toca
un NFC, consulta la carta, conversa con un Mesero IA, pide, paga y recibe su
factura electrónica sin depender permanentemente de un mesero.

> **Opera más mesas con menos carga operativa.**

La descripción completa del producto está en
[`docs/producto/vision.md`](docs/producto/vision.md).

## Estado

- **Odoo Community 19** evaluado y adoptado como motor operativo *headless*
  (POS, catálogo, impuestos, contabilidad). Una base por restaurante. Nadie
  usa su interfaz.
- **`pos/`**: app Next.js del operador. Plano de salón y toma de pedido
  funcionan de punta a punta contra Odoo real (login, catálogo, pedido en
  mesa, envío a cocina, cobro), con contratos y E2E verdes.
- Diseño y decisiones en `docs/`; plan ejecutado en
  `docs/planes/2026-09-04-plan-A-pos-operador.md`.

## Próximos pasos

1. Plan B: KDS de cocina (necesita cronómetros y estados de cocina propios)
2. Plan C: dashboard de ROI y operación en vivo (necesitan eventos del
   bloque 3 y del registro central)
3. Registro central y bloque 3 (experiencia del comensal)
