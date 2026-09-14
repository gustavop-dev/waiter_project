# projectapp_kitchen

Flujo del POS y de cocina sobre `restaurant.order.course`:

1. **Recibida**: `kitchen_fire` registra la comanda. El mesero aún puede cancelar.
2. **En preparación**: cocina pulsa `action_kitchen_start`; `preparation_date` bloquea cambios y cancelaciones.
3. **Lista para entregar**: cocina marca platos o toda la comanda listos (`waiter_ready_date` / `ready_date`).
4. **Entregada**: el mesero marca la entrega (`served_date` por plato y comanda).

`waiter_cancel_lines` elimina las líneas pendientes, recalcula el total y cancela el pedido cuando queda vacío.
El servidor bloquea el pedido durante la cancelación y el inicio de preparación para evitar carreras entre tablets.
La edición de cantidad, producto y nota, y la eliminación directa, también comprueban la preparación.
Los pedidos pagados siguen visibles en cocina hasta entregarse; los cancelados quedan fuera.
El envío repetido de las mismas líneas no duplica comandas.

`kitchen_station` en `pos.category` permite filtrar estaciones.
Los campos de fechas viajan en `load_data`.

Actualizar: `odoo -d <db> -u projectapp_kitchen --stop-after-init` y reiniciar Odoo.
Pruebas: `-u projectapp_kitchen --test-enable --test-tags /projectapp_kitchen` en un puerto libre.
