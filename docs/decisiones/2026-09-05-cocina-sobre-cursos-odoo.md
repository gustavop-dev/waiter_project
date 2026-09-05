# ADR — La comanda de cocina es un `restaurant.order.course` de Odoo

**Fecha:** 2026-09-05 · **Estado:** aceptada · **Afecta a:** Plan B (KDS), Plan A (estado de mesa)

## Contexto

El KDS (pantalla 1c del diseño) necesita, por comanda: hora de envío a cocina,
hora en que quedó lista, hora de entrega en mesa y la estación (parrilla,
fríos, postres…). El mapeo de la API dejó anotado que Odoo Community no guarda
nada de eso y que haría falta "un servicio propio de cocina".

Verificado contra el Odoo 19 real del compose: **sí guarda la mitad.**
`pos_restaurant` trae el modelo `restaurant.order.course` (`order_id`, `index`,
`fired`, `fired_date`, `line_ids`, `uuid`) y `pos.order.line.course_id`. Es la
"comanda enviada" con su hora. Lo que no existe es *listo*, *entregado* ni la
estación. `pos_preparation_display` (el KDS de Odoo) es Enterprise y no está.

## Decisión

1. **Enviar a cocina = crear un curso disparado.** La app POS no marca nada en
   local: llama a un método de servidor que crea el curso con las líneas que
   aún no tienen curso y pone `fired_date` con la hora del servidor.
2. **Un addon propio, `projectapp_kitchen`, añade lo que falta**, sin vistas ni
   menús: `ready_date` y `served_date` en el curso, `kitchen_station` en
   `pos.category`, y tres métodos (`kitchen_fire`, `action_kitchen_ready`,
   `action_kitchen_served`) para que la hora la ponga siempre el servidor.
3. **El estado *en cocina* / *servido* de la mesa sale de los cursos**, no de
   una bandera local del navegador. Cualquier tablet ve lo mismo.

## Alternativas descartadas

- **Servicio Django de cocina.** Duplicaría el pedido fuera de la base del
  restaurante y obligaría a sincronizar dos fuentes de verdad para un dato
  puramente operativo. Los bloques en Django son para lo que no es POS
  (registro central, comensal, IA).
- **Modelo propio `projectapp.kitchen.ticket`.** Reinventa lo que
  `restaurant.order.course` ya representa, y perdería la relación nativa
  línea ↔ curso que Odoo mantiene en `pos.order.line.course_id`.
- **Estado en memoria del navegador (lo que hacía el Plan A).** Se pierde al
  recargar y no lo ve la pantalla de cocina.

## Consecuencias

- Odoo sigue siendo solo motor: el addon no agrega interfaz, solo campos y
  métodos. Se instala con `-i projectapp_kitchen` en el aprovisionamiento.
- Las horas son UTC del servidor (`"YYYY-MM-DD HH:MM:SS"`); el cliente las
  parsea como UTC igual que `date_order`.
- La estación se configura una vez por categoría (`kitchen_station`); las
  pestañas del KDS salen de los valores distintos que existan.
