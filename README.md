# waiter_project

SaaS para restaurantes.

## Estado

Repositorio recién inicializado. Todavía no hay decisiones técnicas tomadas:
stack, arquitectura, modelo de datos y alcance funcional están pendientes de
definir.

## Alcance previsto

El producto contempla (orden y fases por definir):

- Carta digital con QR y pedidos desde el móvil del comensal
- App de meseros para toma de pedidos en mesa
- POS: mesas, cobros, cierre de caja, turnos, tickets
- Backoffice: recetas, costeo, inventario, mermas
- Reportes y analítica de ventas

Es un SaaS multi-tenant: un restaurante = un tenant.

## Próximos pasos

1. Definir el núcleo de la v1 y decomponer el resto en fases
2. Elegir stack y arquitectura
3. Escribir el spec de diseño en `docs/`
