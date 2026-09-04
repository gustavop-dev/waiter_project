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

## Advertencia

Esto es una solución de transición. La respuesta de fondo está en la
[arquitectura](../../docs/arquitectura/2026-09-04-arquitectura-modular.md):
**Odoo es infraestructura interna y el personal no debería verlo nunca.** Cada
versión nueva de Odoo puede mover o renombrar estas clases, así que cuanto antes
el personal use nuestra propia interfaz, antes se puede tirar este módulo.
