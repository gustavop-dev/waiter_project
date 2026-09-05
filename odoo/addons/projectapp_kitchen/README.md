# projectapp_kitchen

Addon **sin interfaz**: solo campos y métodos para que el KDS propio (`pos/`,
ruta `/kds`) trabaje sobre los cursos de Odoo.

| Qué | Dónde |
|---|---|
| `ready_date`, `served_date` | `restaurant.order.course` |
| `kitchen_fire(order_id, line_ids)` | crea el curso disparado; hora del servidor |
| `action_kitchen_ready()` / `action_kitchen_served()` | marcan las horas |
| `kitchen_station` | `pos.category`; llega al cliente por `load_data` |

Instalación: `odoo -d <db> -i projectapp_kitchen --stop-after-init`.
Decisión: `docs/decisiones/2026-09-05-cocina-sobre-cursos-odoo.md`.
