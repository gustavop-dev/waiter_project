# projectapp_ops

Addon **sin interfaz** para el backoffice propio (`pos/`): `pos.order.waiter_origin`
(mesero / comensal / IA), umbrales de alerta y supuestos del ROI en `pos.config`
(llegan al cliente por `load_data`). Instalación: `-i projectapp_ops`.

## Roles (`res.users.waiter_role`)

| Rol | Pantallas en `pos/` | Grupos de Odoo |
|---|---|---|
| `waiter` | salón, pedido, cocina, en vivo, clientes | POS usuario |
| `cashier` | + caja, ventas, facturación | + facturación |
| `admin` | todo + forzar cierre de caja | POS administrador, productos, inventario, facturación |

Al crear o cambiar el rol, el addon reasigna los grupos. Los usuarios se crean
desde Configuración → Usuarios. Demo: `sofia` (mesero) y `julian` (cajero),
clave `Waiter-2026`.
