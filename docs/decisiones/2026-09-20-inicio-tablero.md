# Inicio como tablero, y la caída de Administración · 2026-09-20

## Administración «trabada»: era una caída

Administración abre `/ventas`. El selector de turno hacía `s.startAt.replace(...)`, y una caja **creada pero sin abrir** (`opening_control`) llega de Odoo con `start_at = false`. Mientras existiera una caja en ese estado, toda la página reventaba («This page couldn't load»). El tipo declaraba `start_at: string`, así que TypeScript no avisaba.

**Arreglo en la raíz:** `RawSession.start_at: string | false` → `ShiftRow.startAt: string | null`; la página rotula ese turno «sin iniciar». Regresión: `pos/lib/services/__tests__/sales.test.ts`. Se revisaron las otras pestañas de Administración: ninguna se cae.

Aparte, en **modo desarrollo** cada pantalla se compila la primera vez que se visita tras reiniciar el servidor; con la máquina cargada eso fue 13–30 s por pestaña («next.js: 28.5 s» en `/tmp/waiter-dev/pos.log`, frente a 1.6 s del código de la app). No ocurre en producción.

## Inicio

Antes repetía «En progreso» y «Esperando pago», que ya viven en Pedidos. Ahora responde tres preguntas:

1. **¿Qué tengo que atender ahora?** — `attentionItems` (`pos/lib/domain/insights.ts`), por urgencia: platos listos sin entregar → reservas que empiezan en las próximas 2 h (o que empezaron hace menos de 30 min y no se han sentado) → su anticipo sin pagar → ingredientes sin existencias → productos agotados en la carta → ingredientes por debajo del mínimo (el más crítico primero). Del inventario se muestran 3 de cada tipo y un renglón «y N más»: veinte ingredientes bajos no pueden esconder la reserva que llega en media hora. Cada renglón lleva a la pantalla donde se resuelve. Se refresca cada minuto; cada fuente falla por separado.
2. **¿Qué se pide más y menos?** — últimos 28 días (cuatro semanas completas, para no sesgar el día de la semana). «Menos pedidos» sale de la **carta vigente** (productos con categoría del POS), así incluye los platos con cero ventas y deja fuera los retirados, la propina o una tarjeta de regalo. Flecha de variación frente a los 28 días anteriores y unidades esperadas el mes siguiente al ritmo actual.
3. **¿Cuánto voy a vender el mes que viene?** — `forecastNextMonth`.

Las cifras de ventas (KPI de ventas, platos, predicción) solo las ven **administradores y cajeros**; un mesero ve lo operativo.

### La predicción: simple y explicable a propósito

Cada día del mes siguiente = promedio de **ese día de la semana** en el historial (hasta 84 días), contando como cero los días sin ventas desde la primera venta (un martes cerrado también es información). Se multiplica por la tendencia (últimos 28 días ÷ 28 anteriores), **acotada a ±30 %**. El rango sale de la variación real entre semanas completas (mínimo ±10 %, máximo ±50 %): nunca se muestra una cifra «exacta». La semana en curso y la semana de la primera venta (si no empezó en lunes) no cuentan: una semana a medias parece una semana mala e inflaba el rango a ±24 % con ventas casi idénticas (visto al probar en el navegador).

Con menos de **14 días con ventas** no se predice: se dice cuántos días hay y cuántos faltan. La base de desarrollo tiene 6, así que ahí se ve ese mensaje.

No es un modelo estadístico y no conoce festivos, clima ni promociones. Es la cuenta que haría un buen administrador, hecha siempre y con el método a la vista.

### Servidor

`pos.config.waiter_sales_insights()` (`projectapp_ops/models/insights.py`) solo **suma**: ventas pagadas por día local (84 días) y unidades por producto en dos ventanas de 28 días, sin la propina. Una llamada en vez de traer miles de líneas al navegador. La lógica vive en el POS como funciones puras con pruebas.

### Pruebas

Odoo: `tests/test_insights.py` (compara diferencias, porque corre sobre una copia de la base de desarrollo que ya trae ventas). POS: `lib/domain/__tests__/insights.test.ts` (cifras calculadas a mano), `components/dashboard/__tests__/dashboardCards.test.tsx`.

### Pendiente

- Estacionalidad anual y festivos (hace falta más de un año de historial).
- Predicción de **compras** por ingrediente a partir de las recetas y las unidades esperadas por plato.
- Hora de reposición de un agotado (`available_from`): sigue sin existir en Odoo.

## Ajuste del mismo día: Inicio es visión general; el día a día vive en Ventas · 2026-09-20

Tras verlo, el dueño pidió separar mejor los niveles: Inicio no debe repetir la operación ni el turno.

- **Fuera de Inicio:** «Listos para servir» (está en Pedidos; en Inicio queda solo como aviso en «Para atender ahora») y los KPI del turno.
- **KPI generales** (`generalKpis`): ventas de la semana y del mes, pedidos del mes y ticket promedio de 28 días. Cada periodo en curso se compara con el anterior **a la misma altura** (lunes a hoy contra lunes al mismo día de la semana pasada; del 1 a hoy contra del 1 al mismo día del mes pasado): comparar medio mes contra un mes entero siempre diría «vas mal». Sin periodo anterior se dice, no se muestra un porcentaje. Llevan a Ventas.
- **«Cuándo se vende»** (`weekdayAverages`, `peakHours`): promedio por día de la semana y horas pico de 28 días —para decidir el personal—. El servidor añadió `hourly` al historial. La predicción reutiliza esos mismos promedios.
- Un **mesero** no ve ventas: sus KPI son pedidos abiertos, reservas de hoy, mesas libres y agotados, y a la derecha las mesas disponibles.

### Ventas con filtros

`Administración → Ventas` filtra por **Hoy, Ayer, Esta semana, Este mes, Mes pasado, Rango** o **Por turno** (el de siempre, para cuadrar la caja). `SalesScope` (`lib/domain/salesPeriod.ts`) es un turno o un rango de días **locales** inclusivos; `utcBounds` lo pasa a los límites UTC que guarda Odoo. Cada modelo usa su campo de fecha (`pos.order.date_order`, `pos.payment.payment_date`, `order_id.date_order` en las líneas). Los KPI se **suman en Odoo** (`salesSummary`, `read_group`): un mes pueden ser miles de pedidos y la tabla solo trae los 200 más recientes, y lo dice. «Este mes» cuadra al peso con Inicio (verificado: 17.233.489, 234 pedidos).

### El Catálogo de Administración se fundió con Inventario

Repetía la lista de platos, pero **no era un duplicado exacto**: era el único lugar para editar precio, foto, categoría, impuestos, mostrar u ocultar un plato, tiempo de preparación y precio anterior, y para gestionar las categorías. Borrar la pestaña sin más habría dejado todo eso inalcanzable. Se mudó a Inventario (`components/pantry/MenuAdmin.tsx`, que reutiliza `ProductForm` y `CategoryPanel`):

- Cada tarjeta de plato tiene un lápiz **«Editar precio, foto y carta»** (solo administradores); tocar la tarjeta sigue abriendo receta y existencias.
- En la cabecera de la lista: **Categorías** y **Fuera de la carta** (platos ocultos o sin categoría, que Inventario no lista: desde ahí se devuelven a la carta).
- `/catalogo` redirige a `/inventario`; la pestaña salió de `ADMIN_SUBTABS`. Se borraron `catalog/FilterPanel` y `catalog/ProductCard`. El e2e `catalog-edit-price` ahora recorre el camino nuevo (pasa contra Odoo real).

### Globitos en la línea de tiempo de reservas

Cuando hay reservas fuera de la vista horizontal, un globito en ese borde dice cuántas y a qué hora es la más cercana («2 reservas · después · 20:00»); tocarlo lleva hasta ella. `offscreenReservations` (puro, probado) cuenta una sola vez las reservas de grupo, que aparecen en la fila de cada mesa. La flecha se mece hacia su lado y se queda quieta con `prefers-reduced-motion`. Solo horizontal, que es lo pedido; el desplazamiento vertical (muchas mesas) no avisa.
