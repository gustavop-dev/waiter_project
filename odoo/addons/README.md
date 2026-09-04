# Addons propios de ProjectApp

Módulos de Odoo escritos por nosotros. Se montan en el contenedor como
`/mnt/extra-addons`.

| Módulo | Para qué |
|---|---|
| `projectapp_ui` | Deja la barra superior de Odoo reducida al punto de venta. |

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
| Mesero / cajero | Interfaz POS de Odoo (`/pos/ui`) | Ya existe. Pantalla completa y táctil, sin nada del backoffice. No hay que reconstruirla. |
| Administrador | Backoffice de Odoo | Ya reducido a dos menús. Es lo que limpia este módulo. |
| Cocina | Comanda impresa (`pos.printer`) o KDS propio | **Pendiente de decidir.** El KDS de Odoo es Enterprise. |

Este módulo solo afecta al **backoffice**. La interfaz POS ya viene limpia:
verificado que en `/pos/ui` no existen ni `.o_main_navbar`, ni el menú de
aplicaciones, ni Discuss.

## Advertencia

Es una solución de transición. Cada versión nueva de Odoo puede mover o
renombrar estas clases de CSS, así que el módulo hay que revisarlo en cada
actualización.
