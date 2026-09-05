# Plan C — Backoffice del operador: operación en vivo, ROI y los seis módulos del sidebar

> **Para agentes:** ejecutar tarea por tarea, en orden, con el ciclo de cada
> tarea completo (test que falla → implementación mínima → test que pasa →
> commit). Los pasos usan `- [ ]`. Cada tarea deja software probado y
> commiteado por sí sola.

**Objetivo:** que ninguna entrada del sidebar de `/salon` esté muerta. Dos
pantallas vienen del diseño (**1e Operación en vivo**, **1d Dashboard de
ROI**); las otras seis (Ventas, Catálogo, Inventario, Clientes, Facturación,
Configuración) **no tienen diseño en Claude Design** y se construyen con el
sistema Waiter v1.1 y los patrones de 1d/1e (cabecera de 84 px con título y
segmentos, fila de KPIs, tarjeta blanca con tabla de rejilla, panel derecho de
400 px para detalle/formulario). Facturación es **factura normal de Odoo**
(sin DIAN por ahora); la electrónica entra después como bloque 2.

**Arquitectura:** todo en `pos/` (Next.js) contra Odoo por `lib/services/*`.
Un addon propio más, `projectapp_ops`, sin vistas: `pos.order.waiter_origin`
(mesero / comensal / IA) y, en `pos.config`, umbrales de alerta y supuestos
del ROI. El bloque 3 marca sus pedidos como `diner` al confirmar. Los sonidos
salen del documento **Waiter Sonidos** (Web Audio, cero archivos).

**Stack:** el del Plan A. Sin dependencias nuevas.

**Spec:** `docs/diseno/waiter-pantallas.dc.html` (1d, 1e) · `Waiter Logo`
(dirección 1b: monograma + wordmark con punto Brasa) · `Waiter Sonidos` ·
`docs/diseno/waiter-design-system.dc.html` v1.1.

## Alcance y lo que queda fuera

Dentro: sidebar completamente navegable con badges (atención, stock bajo,
facturas pendientes) y subnavegación (Automatización); sonidos con reglas;
1e con KPIs, tabla de pedidos del turno, alertas por excepción (demorado,
cuenta sin cobrar) y resueltas; 1d con periodo (semana/mes/año), métrica
norte y desglose, sobre conteos reales y supuestos configurables; Ventas
(turnos, por método, por mesero, top productos); Catálogo (productos y
categorías: crear/editar precio, disponibilidad, favorito, estación);
Inventario (almacenables, cantidad, ajuste, bajo stock); Clientes (crear,
editar, historial); Facturación (facturar un pedido pagado a un cliente, ver
PDF, listado); Configuración (restaurante, pisos y mesas, métodos de pago,
impuestos, usuarios, estaciones, densidad, umbrales, supuestos ROI, sonidos).

Fuera: alerta "mesa pide mesero" con fuente real (llega con la PWA), rechazo
DIAN (bloque 2), "Analítica del mesero IA" y "Configurar mesero IA" (estados
vacíos honestos), exportar a archivo (botón deshabilitado), impresión.

## Restricciones globales

Las del Plan A. Además: toda escritura a Odoo pasa por `call_kw` `write`/
`create` en un servicio por dominio (`lib/services/{ops,sales,catalogAdmin,
inventory,customers,invoices,settings}.ts`); las pantallas no conocen modelos
de Odoo. Un sonido a la vez; solo *crítico* se repite (cada 60 s).

## Estado: ejecutado el 2026-09-05 (PR #4 parcial, cerrado al mergear; PR #5 el resto)

Las diez tareas hechas. Desvíos y notas:

- Los seis módulos sin diseño usan el patrón de 1d/1e (cabecera de 84 px,
  KPIs, tabla de rejilla, panel derecho de 400 px). Cuando exista diseño
  propio en Claude Design, se ajustan sobre estos componentes.
- Inventario ajusta existencias por `stock.quant` + `action_apply_inventory`
  (el mecanismo de conteo de Odoo), no por movimientos manuales.
- Facturación emite **factura normal** con `action_pos_order_invoice`; exige
  cliente. El PDF lo sirve Odoo por el proxy same-origin. La electrónica es
  el bloque 2.
- Usuarios: se crean con nombre, usuario y clave; los grupos de POS se asignan
  en el aprovisionamiento (pendiente).
- Densidad y estación de sonido se guardan en el dispositivo (localStorage);
  umbrales y supuestos del ROI en `pos.config` para todas las tablets.
- «Mesa pide mesero» y «Rechazo DIAN» quedan como tipos de alerta sin fuente
  hasta la PWA y el bloque 2.

## Tareas

1. ✅ **Cimientos**: rama, addon `projectapp_ops`, `lib/audio/sounds.ts` (ocho
   sonidos, prioridad, volumen por estación), Sidebar navegable con badges y
   subnav + punto Brasa, `Shell` con `active`, UI compartida (`KpiCard`,
   `Segmented`, `DataTable`, `Field`, `Drawer`, `EmptyState`).
2. ✅ **Operación en vivo** `/operacion` (1e).
3. ✅ **Automatización** `/automatizacion` (1d) + subrutas vacías honestas.
4. ✅ **Ventas** `/ventas`.
5. ✅ **Catálogo** `/catalogo`.
6. ✅ **Inventario** `/inventario`.
7. ✅ **Clientes** `/clientes`.
8. ✅ **Facturación** `/facturacion`.
9. ✅ **Configuración** `/configuracion`.
10. E2E de humo por módulo, docs y PR apilado sobre `feat/05092026-experience`.
