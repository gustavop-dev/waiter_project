# Inventario de un restaurante: alcance y comparación con Vástago

Revisión de `carlos18bp/vastago_project`, commit `25e9ea1474b660c4ce5d9f4b6a2627905ea790f3`, mediante clon local. Se revisaron el servicio `backend/vastago/services/movement_service.py`, los modelos `movement.py` y `document.py`, y el roadmap operativo. Vástago centraliza entradas/salidas en documentos confirmados, registra motivo/documento, cantidad, costo e historial y contempla conteos y mínimos/máximos. Su gestión de sucursales, traslados, consignaciones y etiquetas excede esta fase.

## Decisión

Para un solo restaurante, mantener Odoo como fuente de existencias y movimientos. No duplicar saldos en Vástago ni introducir sincronización entre dos ERP. Usar de Vástago los criterios de confirmación, trazabilidad, control de concurrencia y conteo físico.

| Necesidad | Antes | Implementación de esta fase |
| --- | --- | --- |
| Ingredientes y proveedores | Existían | Se conservan; se suman L y ml a las unidades del POS |
| Recetas | Se creaban junto con platos; sin edición en su ficha | Ficha editable, ingredientes y cantidades por lote, porciones producidas, versión y unidades compatibles |
| Cuántos platos alcanzan | Existencias / receta, sin compromisos | Mínimo de ingredientes libres / consumo por plato; incluye ingredientes compartidos por pedidos pendientes |
| Consumo por venta | Kits de Odoo disponibles, pero la API de cobro propio no generaba el albarán de salida | Dependencia explícita; salida de recetas al cobrar, sin esperar cierre de caja; sin doble descuento en la disponibilidad |
| Costo del plato | No expuesto | Suma de cantidades por plato × costo configurado de cada ingrediente |
| Entradas y mermas | Solo editar una cantidad total | Movimientos explícitos, motivo/referencia, empleado y protección contra doble envío |
| Conteo físico | Sobrescribir existencias | Ajuste a cantidad contada; rechaza un conteo si las existencias cambiaron desde su consulta |
| Trazabilidad | En Odoo | Últimos 100 movimientos del ingrediente, incluidos consumos del POS |
| Reposición | Mín/máx y RFQ en borrador | Configuración de mínimos/máximos desde la ficha y conversión a la unidad de compra del proveedor |

## Reglas operativas

- La receta define cantidades **para el lote completo** y cuántos platos produce. Por plato se divide entre ese rendimiento.
- La precisión de unidades de producto se fija en al menos cuatro decimales (se conserva si ya era mayor), para que 5 g no se descuenten como 10 g al inventariar en kg. Las cantidades se convierten sin redondeo intermedio. No se pueden convertir gramos a unidades o litros a kilogramos sin una relación válida. No se aceptan ingredientes duplicados, inactivos, inexistentes ni cantidades nulas/negativas.
- Los pedidos positivos pendientes comprometen ingredientes. Los albaranes ya completados se restan de ese compromiso; el stock físico ya refleja su salida. Cancelar antes de preparar libera el compromiso.
- No se generan salidas retroactivas para ventas antiguas de sesiones cerradas que no tenían albarán. Al ponerlo en uso, un conteo físico establece la base real; los pedidos aún abiertos sí comprometen ingredientes.
- Las raciones de varios platos **no se suman** si usan los mismos ingredientes. Es disponibilidad individual actual, no un planificador de combinaciones ni una reserva transaccional que bloquee nuevas ventas.
- Una receta no se modifica mientras haya pedidos pendientes de ese plato. Los ingredientes usados en recetas activas no se archivan.
- Entradas: registrar mercancía efectivamente recibida y su referencia. No duplicar una recepción ya registrada en Compras/Inventario de Odoo. La entrada manual no crea una factura de compra ni confirma/envía la RFQ.
- Mermas: salida adicional identificada. El consumo normal previsto en una receta no debe registrarse otra vez como merma.
- Conteos: cantidad absoluta encontrada, no cantidad a sumar. Se bloquean mientras haya pedidos pendientes del ingrediente para no descontar otra vez lo ya preparado al cobrar. Si la cifra consultada cambió, actualizar antes de aplicar.
- Un movimiento reintentado con el mismo identificador no se vuelve a descontar/sumar. Los cambios requieren PIN vigente del administrador y permisos del terminal.
- Cambiar datos del ingrediente ya no permite cambiar el stock desde ese formulario: se usa la ficha de movimientos.

## Acceso

Inventario → Menú → plato: disponibilidad, limitante, costo y editar receta.

Catálogo → producto existente → Receta e inventario: acceso a la ficha del plato publicado en el menú.

Inventario → Ingredientes → ⋯ → Existencias y movimientos: entradas, mermas, conteos, costo, mínimos/máximos e historial.

## Límites deliberados y siguiente etapa

- Un restaurante y el almacén principal. No multitenant, sucursales ni traslados entre sedes.
- Recetas base de ingredientes, con rendimiento de lote. Subrecetas elaboradas con stock propio, variaciones por tamaño/adiciones y planificación conjunta de producción requieren su propio flujo.
- El costo mostrado es de ingredientes a costo configurado; excluye mano de obra, servicios, impuestos, empaque no incluido en receta y otros gastos. No es margen neto.
- Lotes, vencimientos, FEFO, recepciones parciales y devoluciones de compra se mantienen en Inventario/Compras de Odoo. El formulario simplificado rechaza ingredientes con trazabilidad por lote o stock en sububicaciones.
- Antes de activar devoluciones de platos preparados, definir la política de recuperación/merma: un reembolso comercial no implica que los ingredientes vuelvan físicamente a la despensa.
- La disponibilidad se refresca al abrir fichas, manualmente y periódicamente en la lista. No bloquea la venta por faltantes: muestra información para control operativo.

El siguiente crecimiento útil sería lotes y caducidad, elaboración de bases (salsas/masas) y comparación de consumo teórico con conteos reales. Multitenancy queda para una fase independiente.
