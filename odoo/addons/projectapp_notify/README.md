# projectapp_notify

Addon **sin vistas**: la campana del kit CloudPos (Dashboard › Notification, pestañas Kitchen / Inventory /
System) y sus generadores. Depende de `projectapp_kitchen`, `stock` y `purchase`.

## Modelo `waiter.notification`

| Campo | Tipo | Qué |
|---|---|---|
| `kind` | Selection `kitchen` / `inventory` / `system` | pestaña del kit |
| `title`, `body` | Char | «Plato listo para servir», «Ajiaco · Mesa 7» |
| `res_model`, `res_id` | Char, Integer | entidad relacionada (`pos.order`, `product.product`) |
| `action` | Char | lo que el POS ofrece: `serve`, `request_ingredient` |
| `action_done` | Boolean | la acción ya se hizo (o el aviso dejó de aplicar) |
| `read` | Boolean | leída |
| `user_id` | Many2one `res.users` | vacío = para todos los usuarios del terminal |
| `create_date` | Datetime | «Just now», «13 min ago» se calculan en el cliente |

Orden por defecto: `create_date desc`. Regla de registro: un usuario del POS ve las generales y las suyas;
el administrador del POS ve todas. Lectura desde el POS:

```
waiter.notification.search_read([['user_id', 'in', [false, uid]]], ['kind','title','body','res_model','res_id','action','action_done','read','create_date'])
```

| Método | Firma | Devuelve |
|---|---|---|
| Marcar todo leído | `waiter.notification.waiter_mark_all_read()` | cuántas cambió |
| Marcar leídas | `waiter.notification.waiter_mark_read(ids)` | `True` |
| Stock bajo (cron, cada 5 min) | `waiter.notification.waiter_check_low_stock()` | ids creados |
| Pedir ingrediente | `waiter.notification.waiter_request_ingredient(product_id, qty=None)` | `{purchase_id, name, partner_id, partner_name, product_qty}` |

## Generadores

- **Cocina**: al escribir `ready_date` en un `restaurant.order.course` (es decir, `action_kitchen_ready()`) se crea
  una notificación por línea no cancelada: título «Plato listo para servir», cuerpo `<producto> · Mesa <n>` (o el
  número del pedido si no hay mesa), `res_model = pos.order`, `action = serve`. Reescribir `ready_date` no duplica.
- **Inventario**: el cron `Waiter: avisar stock bajo` (`data/cron.xml`, cada 5 minutos) recorre
  `stock.warehouse.orderpoint` de productos almacenables y crea «Stock bajo» cuando `qty_on_hand < product_min_qty`.
  No duplica mientras el producto siga bajo (busca una abierta con `action_done = False` del mismo producto); cuando
  el producto se recupera, las abiertas se cierran con `action_done = True`, y una caída posterior vuelve a avisar.
- **Solicitud**: `waiter_request_ingredient(product_id)` crea un `purchase.order` en borrador con el proveedor de
  `product.supplierinfo` (`_select_seller`), cantidad = lo que falta para `product_max_qty` (o el mínimo del
  proveedor, o 1), precio del proveedor, y marca `action_done` en las notificaciones de inventario del producto.
  `UserError` si el producto no tiene proveedor.

Instalación: `-i projectapp_notify`. Pruebas: `-u projectapp_notify --test-enable --test-tags /projectapp_notify`
(`tests/test_notify.py`).
