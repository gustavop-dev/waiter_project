# Addons propios de ProjectApp

Módulos de Odoo escritos por nosotros. Se montan en el contenedor como
`/mnt/extra-addons`. Ninguno tiene vistas: el backoffice y el POS son nuestros (`pos/`).

| Módulo | Para qué | Depende de |
|---|---|---|
| `projectapp_ui` | Deja la barra superior de Odoo reducida al punto de venta. | `web` |
| `projectapp_pos_design` | Tipografías, tokens y marca del POS de Odoo (transición). | `point_of_sale` |
| `projectapp_ops` | Operación: origen del pedido, umbrales y ROI en `pos.config`, marca en `res.company`, origen de imagen y `available_from` en producto, silla de bebé / esperando pago / prefijo y número (`DI104`) / entrega en `pos.order`, `floor_type` y `rotation` en el salón, PIN con bloqueo y turno (`hr.employee` + `hr.attendance`), preferencias de notificación en `res.users`, siembra de presets, «Puntos Waiter» y empleados demo. | `pos_restaurant`, `pos_self_order`, `pos_hr`, `hr_attendance`, `pos_loyalty`, `account`, `product`, `stock`, `mail` |
| `projectapp_kitchen` | Cocina sobre los cursos: `ready_date`, `served_date` por curso **y por línea**, cancelación antes de cocina, estación por categoría. | `pos_restaurant` |
| `projectapp_notify` | `waiter.notification` (cocina / inventario / sistema): plato listo, stock bajo (cron), solicitud al proveedor (`purchase.order`). | `projectapp_kitchen`, `stock`, `purchase` |
| `projectapp_reservations` | Reservas de mesa del kit (`waiter.reservation`): franjas de 30 min, mesa, personas, silla de bebé, pre-pedido `pos.order` y correo de confirmación; horario en `pos.config`; próxima reserva por mesa para el plano. | `pos_restaurant`, `mail` |
| `projectapp_pantry` | Despensa del kit: ingredientes (`product.template.is_ingredient`, categorías, niveles desde orderpoint), recetas (`mrp.bom` kit), raciones servibles, solicitud al proveedor y siembra demo. | `mrp`, `purchase`, `stock`, `uom`, `point_of_sale` |

Instalar en una base nueva:

```
odoo -d <db> -i pos_restaurant,pos_self_order,pos_hr,hr_attendance,loyalty,pos_loyalty,mrp,purchase,projectapp_ops,projectapp_kitchen,projectapp_notify,projectapp_reservations,projectapp_pantry --stop-after-init
```

Actualizar el Odoo compartido (`odoo-spike`, db `projectapp`) tras cambiar los addons, y sembrar el kit una vez
(el `post_init_hook` solo corre al instalar):

```
cd odoo/compose
docker compose -p odoo-spike exec -T odoo odoo -d projectapp -i projectapp_notify,projectapp_reservations,projectapp_pantry -u projectapp_ops,projectapp_kitchen --stop-after-init
docker compose -p odoo-spike restart odoo
odoo/provisioning/seed-kit.sh projectapp odoo-spike
```

Pruebas (runner de Odoo, en una base de prueba propia, nunca en la compartida):

```
odoo -d kittest -u projectapp_ops,projectapp_kitchen,projectapp_notify,projectapp_reservations,projectapp_pantry --test-enable --test-tags /projectapp_ops,/projectapp_kitchen,/projectapp_notify,/projectapp_reservations,/projectapp_pantry --stop-after-init
```

## Por qué existe `projectapp_ui`

Los módulos que meten ruido en la barra superior (`mail`, `web`) **no se pueden
desinstalar**: `point_of_sale` depende de ellos por la cadena
`stock_account → account → mail`. Y los iconos de Mensajes, Actividades y el
menú de aplicaciones no vienen de un módulo opcional, sino del armazón web.

La única vía es ocultarlos. Se hace por CSS, con selectores de **clase** y nunca
de `aria-label`, porque las etiquetas están traducidas y cambian con el idioma.

## Qué interfaz ve cada quién

Odoo tiene **dos interfaces distintas**, y conviene no confundirlas:

| Público | Interfaz | Estado |
|---|---|---|
| Comensal | Nuestra PWA (bloque 3) | Por construir. **Nunca ve Odoo.** |
| Mesero / cajero | Nuestro POS (`pos/`, kit CloudPos) | En construcción (Plan I). Se identifica con PIN de empleado. |
| Administrador | Backoffice de Odoo | Ya reducido a dos menús. Es lo que limpia `projectapp_ui`. |
| Cocina | KDS propio (`pos/kds`) sobre `projectapp_kitchen` | Hecho. |

`projectapp_ui` solo afecta al **backoffice**.

## Advertencia

`projectapp_ui` y `projectapp_pos_design` son soluciones de transición. Cada versión nueva de Odoo puede mover o
renombrar estas clases de CSS, así que hay que revisarlos en cada actualización.

[Operación](projectapp_ops/README.md) · [Cocina](projectapp_kitchen/README.md) · [Avisos](projectapp_notify/README.md) ·
[Reservas](projectapp_reservations/README.md) · [Despensa](projectapp_pantry/README.md) ·
[Arquitectura](../../docs/arquitectura/2026-09-04-arquitectura-modular.md).

