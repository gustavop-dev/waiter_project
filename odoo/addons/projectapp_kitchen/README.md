# projectapp_kitchen

Addon **sin interfaz**: solo campos y métodos para que el KDS propio (`pos/`,
ruta `/kds`) y el detalle del pedido del kit CloudPos trabajen sobre los cursos de Odoo.

| Qué | Dónde |
|---|---|
| `ready_date`, `served_date` | `restaurant.order.course`; viajan en `load_data` junto a `fired_date` |
| `kitchen_fire(order_id, line_ids)` | crea el curso disparado; hora del servidor |
| `action_kitchen_ready()` / `action_kitchen_served()` | marcan las horas del curso; **servir el curso marca `served_date` en cada línea** |
| `served_date` (Datetime), `waiter_cancelled` (Boolean) | `pos.order.line`; viajan en `load_data` |
| `action_kitchen_line_served(line_ids)` (`@api.model`) | marca las líneas servidas; cuando todas las líneas de un curso están servidas o canceladas el curso queda `served_date`. Devuelve los ids de los cursos cerrados |
| `waiter_cancel_lines(line_ids)` (`@api.model`) | marca `waiter_cancelled`; `UserError` si alguna línea está en un curso `fired` |
| `kitchen_station` | `pos.category`; llega al cliente por `load_data` |

Estados del kit (Plan I): «In Progress (n %)» = líneas servidas / líneas enviadas; «Ready to Served» = todos los
cursos con `ready_date` y alguno sin `served_date`; «Served» = todas las líneas servidas; «Waiting to cooked»
(línea) = sin curso o curso sin `fired`, la única que se puede cancelar.

Instalación: `odoo -d <db> -i projectapp_kitchen --stop-after-init`. Actualizar: `-u projectapp_kitchen`.
Pruebas: `-u projectapp_kitchen --test-enable --test-tags /projectapp_kitchen` (`tests/test_kitchen.py`).
Decisión: `docs/decisiones/2026-09-05-cocina-sobre-cursos-odoo.md`.
