# Addons propios de ProjectApp

Odoo Community 19 funciona como motor operativo. La interfaz del operador es `pos/`,
el KDS está en `/kds` y el comensal usa `diner/` a través de `experience/`.
Los addons se montan en `/mnt/extra-addons`.

| Módulo | Responsabilidad |
|---|---|
| `projectapp_kitchen` | Cursos de cocina, listo, entregado y estación; sin interfaz. |
| `projectapp_ops` | Roles, operación, ROI, marca, atributos de productos, descuento y pasarela de ajustes de plantillas. |
| `projectapp_pos_design` | Estilos del POS nativo usados en el spike; referencia histórica, no interfaz del producto. |
| `projectapp_reservations` | Reservas de mesa del kit (`waiter.reservation`): franjas de 30 min, mesa, personas, silla de bebé, pre-pedido `pos.order` y correo de confirmación; horario en `pos.config`; próxima reserva por mesa para el plano. Sin interfaz. |
| `projectapp_pantry` | Despensa del kit: ingredientes (`product.template.is_ingredient`, categorías, niveles desde orderpoint), recetas (`mrp.bom` kit), raciones servibles, solicitud al proveedor (`purchase.order` borrador) y siembra demo. Sin interfaz. |

H añade una corrección al recálculo de subtotales de `pos_self_order`: cada línea
incluye su descuento y cuadra con el total del pedido. `projectapp_ops` declara esa
dependencia. Al actualizar código: `-u projectapp_ops --stop-after-init` y reiniciar
Odoo; los contratos de experience comprueban el cálculo en la base demo.

Plan I (kit CloudPos): `-i projectapp_reservations,projectapp_pantry` sobre un Odoo con `mrp` y
`purchase`; pruebas con `-u projectapp_reservations,projectapp_pantry --test-enable
--test-tags /projectapp_reservations,/projectapp_pantry --stop-after-init`.

[Detalle del addon](projectapp_ops/README.md) ·
[Reservas](projectapp_reservations/README.md) · [Despensa](projectapp_pantry/README.md) ·
[Arquitectura](../../docs/arquitectura/2026-09-04-arquitectura-modular.md) ·
[Revisión H](../../docs/revisiones/2026-09-05-cierre-H-pr14.md).
