# Plan I · Rediseño completo del POS sobre el kit CloudPos

> **Para agentes:** este es el plan maestro. Cada oleada tiene (o tendrá) su plan ejecutable con
> tareas paso a paso; la primera es [Plan I.1 · Sistema de diseño y armazón](2026-09-06-plan-I1-sistema-de-diseno.md).
> Ejecutar con `superpowers:subagent-driven-development` o `superpowers:executing-plans`.

**Objetivo.** El POS del operador (`pos/`) pasa a usar la interfaz del kit CloudPos al 100 %: sus 92
pantallas, sus componentes, sus iconos (Tabler), su tipografía (Open Sans) y su modo oscuro. Lo que el
kit no dibuja (KDS, caja, ventas, catálogo, clientes, facturación, configuración) se rediseña con los
mismos componentes. Lo que Odoo 19 Community no da (reservas, notificaciones, niveles de despensa,
turno del empleado) se desarrolla en addons propios, cada uno separable.

**Especificación:** [Inventario del kit frente al POS](../diseno/2026-09-06-inventario-kit-cloudpos.md).
Pantallas en `docs/diseno/pos-kit/pantallas/`, textos exactos en `docs/diseno/pos-kit/textos/`.

**Decisiones del usuario (2026-09-06):**

1. Kit usado al 100 %: todas las pantallas, sus iconos y sus componentes.
2. Backend que Odoo no traiga se desarrolla en addons propios.
3. Login por PIN de empleado: el mesero se identifica al llegar y no puede operar desde fuera con
   un usuario de Odoo.
4. Fidelización por puntos desde el inicio (`loyalty` + `pos_loyalty`).
5. Inventario por ingredientes completo (recetas, proveedores, solicitudes) con `mrp` y `purchase`.
6. Arquitectura modular: reservas, despensa, notificaciones y fidelización son módulos separables,
   tanto en Odoo como en el POS.
7. Pago QR simulado, como el pago del comensal.
8. Delivery incluido como tercer tipo de pedido.
9. Todo se rediseña con la interfaz del kit, incluido lo que el kit no contempla.

## Restricciones globales

- Odoo 19 Community, imagen `odoo:19`, addons en `odoo/addons/` montados en `/mnt/extra-addons`.
  Módulos estándar que se activan: `pos_hr`, `hr_attendance`, `loyalty`, `pos_loyalty`, `mrp`,
  `purchase`, `pos_online_payment`. Ninguno es Enterprise (verificado en la imagen).
- POS: Next.js 16.3.3, React 19, Tailwind 4.3.3, Zustand 5, next-intl 4.14 (locale `es`), Jest 30 con
  jsdom, Playwright 1.62. Node 24. Sin librerías nuevas salvo `@tabler/icons-react` y
  `@fontsource/open-sans`.
- Nombres y textos en español en la interfaz; los textos del kit se traducen y se guardan en
  `pos/lib/i18n/messages/es.json` bajo `pos.kit.*` y las claves del módulo. Las etiquetas originales en
  inglés viven en `docs/diseno/pos-kit/textos/` para cotejar.
- Tokens del kit (medidos en el `.fig`, no en la guía de estilo, que es de otro producto):
  primario `#447DFC`; tinta `#0F172A`; texto suave `#475569`; terciario `#94A3B8`; lienzo `#F8FAFC`;
  atenuado `#F1F5F9`; borde `#E2E8F0`; superficie `#FFFFFF`; velo de modal `#131316`; en progreso
  `#F59E0B` sobre `#FFFBEB`; error `#EF4444` sobre `#FEF3F2`; info `#6172F3` sobre `#EEF4FF`; éxito
  `#22C55E` sobre `#F0FDF4` (única familia no medida: ajustar contra las capturas). Oscuro: fondo
  `#131316`, superficie `#1A1A1E`, elevado `#26272B`, borde `#51525C` y `#3F3F46`, texto `#F7F7F7`, suave
  `#A0A0AB`, apagado `#70707B`. Tipografía Open Sans 400 / 500 / 600, tamaños 12 · 14 · 16 · 20 · 24 · 30.
  Radio dominante 12 px; 14, 16 y 24 en tarjetas y modales. Iconos: Tabler Icons.
- Moneda COP sin decimales e impuestos por línea desde Odoo; el "Tax 12 %" del kit se sustituye por el
  desglose real (IVA, impoconsumo) en la misma posición.
- Contrato existente que no se rompe: `experience/` y `diner/` siguen leyendo Odoo por el addon
  `projectapp_ops`; el KDS sigue sobre los cursos de `projectapp_kitchen`.
- Cada oleada termina con Jest, typecheck, lint y sus E2E verdes, y con la comparación visual de sus
  pantallas contra los PNG del kit (captura Playwright a 1194×834 junto al PNG original).

## Arquitectura

### Odoo: un addon por módulo separable

| Addon | Nuevo | Responsabilidad | Depende de |
|---|---|---|---|
| `projectapp_ops` | extiende | Campos de operación: `baby_chair` y prefijo por tipo en `pos.order`, `available_from` en producto, `floor_type` en piso, `rotation` en mesa, preferencias de notificación en `res.users`, siembra de presets Dine In / Take Away / Delivery, `waiter_check_pin` y turno del día en `hr.employee` | `pos_restaurant`, `pos_self_order`, `pos_hr`, `hr_attendance`, `pos_loyalty` |
| `projectapp_kitchen` | extiende | `served_date` por línea (checkbox del kit) además del curso | `pos_restaurant` |
| `projectapp_reservations` | nuevo | `waiter.reservation` con estado, mesa, franja, personas, silla de bebé, cliente, pre-pedido y correo de confirmación; estado "reservada" de la mesa por franja | `pos_restaurant`, `mail`, `projectapp_ops` |
| `projectapp_pantry` | nuevo | Ingredientes (productos no vendibles), categorías del kit, receta por plato (`mrp.bom` tipo kit), raciones servibles, niveles Low / Medium / High / Empty desde `stock.warehouse.orderpoint`, solicitud al proveedor (`purchase.order` en borrador + correo), lista de solicitudes | `mrp`, `purchase`, `stock`, `uom`, `projectapp_ops` |
| `projectapp_notify` | nuevo | `waiter.notification` (tipo `kitchen` / `inventory` / `system`, título, cuerpo, entidad, acción, leído, usuario) y sus generadores: plato listo (desde `ready_date`), stock bajo (desde orderpoint) | `projectapp_kitchen`, `projectapp_pantry` |

Todos sin vistas de Odoo. Todos con tests del runner de Odoo (`-u <addon> --test-enable --test-tags /<addon>`).

### POS: un directorio por módulo

```
pos/
  components/kit/          ← sistema de diseño del kit: TopBar, Chip, StatusPill, Card, Modal, Wizard,
                             Toast, NumericKeypad, PinInput, QtyStepper, Toggle, Icon, EmptyState
  components/<modulo>/     ← dashboard, orders, tables, reservations, payment, history, pantry, account,
                             kds, cash, sales, catalog, customers, billing, settings
  lib/services/<modulo>.ts ← una capa por addon o módulo de Odoo (reservations.ts, pantry.ts, loyalty.ts,
                             notifications.ts, employees.ts)
  lib/stores/<modulo>Store.ts
  lib/domain/<modulo>.ts   ← reglas puras y testeables (progreso del pedido, niveles de stock, franjas)
  app/(pos)/<ruta>/        ← dashboard, pedidos, salon, reservas, historial, inventario, caja, kds,
                             ventas, catalogo, clientes, facturacion, configuracion
```

Un módulo se saca del POS copiando su directorio de `components/`, su servicio, su store, su dominio
y su addon. Nada de un módulo importa de otro módulo salvo de `components/kit` y `lib/services/odoo.ts`.

### Navegación

La barra superior del kit tiene seis pestañas para el mesero. Los demás módulos usan el mismo
componente "Navigation Item" del kit y aparecen según el rol:

| Rol | Pestañas |
|---|---|
| Mesero | Dashboard · Pedidos · Mesas · Reservas · Historial · Inventario |
| Cajero | las del mesero + Caja |
| Cocina (dispositivo) | Cocina (KDS a pantalla completa) |
| Administrador | las del cajero + Administración (segunda fila con los chips "Tab Menu" del kit: Ventas · Catálogo · Clientes · Facturación · ROI · Configuración) |

El chip de usuario abre el modal "Setting" del kit (perfil, notificaciones, seguridad, pantalla, salir).

### Identidad y sesión

1. El terminal abre una sesión de Odoo una vez con el usuario del terminal (pantalla actual de correo
   y contraseña, rediseñada), y abre la caja si no está abierta.
2. Cada empleado se identifica en "Select Employee" con PIN de 6 dígitos (`hr.employee.pin`, validado
   en servidor por `waiter_check_pin`, con bloqueo tras cinco intentos). El servidor registra la
   entrada con `hr_attendance` y el POS guarda el empleado activo en `authStore.employee`.
3. Todo `pos.order` lleva `employee_id` (campo de `pos_hr`). El rol operativo se toma de
   `hr.employee.waiter_role` (nuevo, espejo del rol de usuario).
4. Los meseros no tienen usuario de Odoo. Solo el terminal y los administradores.
5. "Log Out" del kit cierra la asistencia del empleado; la sesión de Odoo del terminal se cierra desde
   Caja (administrador o cajero).

### Estados del pedido en el lenguaje del kit

| Kit | Cómo se deriva |
|---|---|
| In Progress (n %) | Nada en el pase todavía; % = líneas servidas / líneas enviadas |
| Ready to Served | Alguna línea con `ready_date` en su curso y sin `served_date`: hay algo que llevar |
| Served | Todas las líneas servidas |
| Waiting for Payment | Bandera `billing` (hoy local; pasa a `pos.order.waiter_billing` en `projectapp_ops` para compartir entre tablets) |
| Completed | `state = paid` |
| Waiting to cooked (línea) | Línea sin curso o curso sin `fired` |

#### El viaje de un plato (lo que ve el mesero)

Cuatro estados por **línea**, no por curso: el mesero sirve plato a plato y el curso se cierra solo cuando
no le queda ninguno pendiente (`action_kitchen_line_served` en `projectapp_kitchen`).

| Estado | Lo mueve | Dónde se ve |
|---|---|---|
| Sin enviar | el mesero, al crear la ronda | tarjeta del pedido, grupo «Esperando cocina» del detalle |
| Cocina | el mesero, al lanzar el curso | ficha del KDS, píldora naranja de la mesa |
| Listo | **cocina**, con «Listo» (un plato) o «Listo todo» (la comanda) en el KDS (`waiter_ready_date`) | pase del KDS, panel «Listos para servir» del Inicio, píldora verde en el plano, campana |
| Servido | **el mesero**, al dejarlo en la mesa (`served_date` de la línea) | casilla marcada; con todas marcadas se habilita Cobrar |

Las dos manos son distintas y ninguna hace el trabajo de la otra. Cocina saca los platos de uno en uno
—o toda la comanda de una vez— y ahí termina su parte: el pase del KDS es una lista de espera, no un
mando. El mesero los lleva y los marca entregados, también de uno en uno o todos a la vez, desde el
panel del Inicio, el detalle de la mesa o la casilla de la tarjeta de Pedidos.

**Nadie entrega lo que cocina no ha marcado listo.** La regla vive en `action_kitchen_line_served`
(`projectapp_kitchen`) y no en la pantalla, porque son tres las pantallas que ofrecen entregar.

Cada aviso nuevo suena y salta en pantalla en la tablet del mesero según lo que tenga marcado en
Ajustes › Notificaciones (`res.users.waiter_notify`): el mesero no vive mirando la pantalla.

#### Cómo viajan los cambios (bus en vivo, con el sondeo de red)

El servidor avisa; la tablet no pregunta. `projectapp_bus` manda por el bus de Odoo un aviso por
terminal (`waiter_pos_<config_id>`) cuando algo cambia de verdad: comanda enviada (`kitchen`), plato
listo o entregado (`orders`), aviso nuevo (`notify`). El aviso **no lleva datos**, solo qué cambió;
quien lo recibe vuelve a leer por donde ya leía, así el bus no se vuelve una segunda copia del modelo
ni filtra nada por un canal que, por diseño de Odoo, el cliente pide por nombre (de ahí el filtro en
`_build_bus_channel_list`).

El POS abre **una conexión por tablet** a `/odoo/websocket` —mismo origen, por el proxy de Next, así
la cookie viaja sin depender de dónde esté Odoo— y la cierra al salir, no en cada navegación. La
versión que Odoo exige en el handshake se pregunta (`waiter_bus_info`), no se escribe en el cliente:
cambia entre versiones de Odoo.

**El sondeo sigue ahí, de red.** Con el bus vivo se espacia a 60 s; si el bus no levanta o se cae,
vuelve solo al ritmo corto y todo funciona como antes. El bus acelera, no es un requisito.

Medido contra el Odoo real (`pos/scripts/bench-sondeo.cjs`, una tablet, 60 s en régimen):

| Pantalla | solo sondeo | con bus |
|---|---|---|
| Pedidos | 52 llamadas/min · 32 KB | **11 · 10 KB** |
| Inicio | 62 · 40 KB | **18 · 14 KB** |
| Mesas | 23 · 4 KB | **7 · 3 KB** |
| Cocina | 52 · 30 KB | **4 · 3 KB** |

Latencia medida: salón → cocina **1,1 s**; cocina → mesero **1,8 s** (eran 10-15 s con solo sondeo).
`BLOQUEAR_BUS=1 node scripts/bench-sondeo.cjs` mide el modo de respaldo, que es la columna izquierda.

Lo que aguanta: con 61 pedidos abiertos y 245 líneas la consulta pesada sigue en 25-35 ms (va por
índice). El techo era la concurrencia del sondeo y el bus se lo lleva casi entero. En producción
sigue tocando fijar `workers` (aquí, 6 núcleos → 13); el contenedor de desarrollo corre con uno.

#### Reservas: apartar no es bloquear el día

Una reserva de las 20:00 no puede dejar la mesa muerta desde el almuerzo. `prep_minutes` (a la hora,
15, 30, 60 o 120 minutos; 30 por defecto) dice cuánto antes se aparta la mesa **para prepararla** —no
porque el comensal esté ya en el local— y `hold_start = time_start − margen` es la hora desde la que
deja de ofrecerse. Fuera de esa ventana la mesa se usa con normalidad.

La ventana manda en los tres sitios: el plano solo pinta «Reservada» dentro de ella, el choque entre
reservas se mide con el margen de las dos partes, y el paso 1 del asistente lo elige y dice en texto
de cuándo a cuándo quedará apartada.

#### Lo que la sala puede hacer

Dos permisos en `pos.config`, los dos en Configuración › Usuarios, porque quién hace qué lo decide el
restaurante y no el código:

| Permiso | Por defecto | Apagado |
|---|---|---|
| `waiter_can_charge` | sí | Cobrar es de caja: el mesero deja la mesa servida y el cajero la elige en el plano y cobra. No hace falta que el mesero mande nada, la mesa servida ya es la señal. La tarjeta dice «Cobra la caja». |
| `waiter_can_edit_inventory` | no | El mesero ve el inventario y puede solicitar ingredientes al proveedor, pero no crear, editar ni borrar platos e ingredientes. |

`can.charge` y `can.editInventory` (`lib/domain/roles.ts`) los aplican; los dos son de la forma
«el rol que no es mesero siempre puede».

## Oleadas

Cada oleada produce software funcional y verificable por sí sola. Los planes I.2 a I.8 se escriben al
empezar cada oleada, con el mismo formato paso a paso del I.1.

### I.1 · Sistema de diseño y armazón (plan detallado: [Plan I.1](2026-09-06-plan-I1-sistema-de-diseno.md))

Tokens del kit en Tailwind con modo claro y oscuro, Open Sans, Tabler Icons, componentes base del
kit con pruebas, barra superior por rol, modal "Setting" con tema e idioma, sistema de toasts,
galería de componentes en desarrollo para cotejar con los PNG. Las rutas actuales siguen funcionando
dentro del nuevo armazón.

### I.2 · Mesas

- Addon: `floor_type` en `restaurant.floor`, `rotation` en `restaurant.table`, endpoint de mover
  pedido (`waiter_move_order(order_id, table_id)` con validación de destino libre).
- POS: plano real con `position_h/v`, `width`, `height`, `shape`, `seats` (sillas dibujadas por
  plantilla Small / Large H / Large V según ancho, alto y sillas); leyenda Available / Not Available /
  Reserved; pestañas de piso y dropdown con 4+; barra "Table Selected"; modal "Table Detail" con
  estado por plato, "Change Table", "+ New Order", "Proceed to Payment"; engranaje con lista de pisos
  y toggle; wizard "Add New Layout Table" (imagen de fondo del piso, cuadrícula, arrastrar, rotar,
  borrar, nombre); "Edit Layout Table". Unir mesas con `parent_id` queda para I.9.
- E2E: crear piso con dos mesas por arrastre, mover un pedido de mesa.

### I.3 · Pedidos

- Addon: siembra de presets (Dine In `table`, Take Away `counter`, Delivery `delivery` con
  `identification = address`), `baby_chair`, prefijo `DI` / `TA` / `DE` en `tracking_number`,
  `served_date` por línea, cancelación de líneas no disparadas.
- POS: pestaña Pedidos con buscador, filtros por estado con conteo, orden, tarjetas con tabla de
  ítems y checkbox de servido, "See Details", "Pay Bills"; wizard "Create New Order" (tipo, personas,
  silla de bebé, nombre, dirección y teléfono en Delivery, mesa, menú con categorías y conteo, modal
  "Add Order" con atributos de `price_extra` como add-on obligatorio y combos como opcionales, nota,
  resumen, "Create Order and Send to Kitchen"); "Detail Order" agrupado por estado; pop up "Add New
  Order" para rondas; "Available on HH:MM" desde `available_from`; toasts.
- E2E: pedido Dine In con add-on y nota llega al KDS; Take Away cobra antes de cocina; Delivery pide
  dirección.

### I.4 · Pago e historial

- Addon: `pos_loyalty` configurado con programa "Loyalty Cards" (100 puntos = 1 000 COP, ajustable),
  endpoint `waiter_member_lookup(code)`; pago QR simulado (`waiter_qr_payment_simulate`) que registra
  un `pos.payment` con método "QR (demo)" y marca el pedido; `pos.order.waiter_billing`.
- POS: modal "Payment" del kit con socio y puntos, Cash (montos rápidos en COP, teclado), Card
  (temporizador y "Move to EDC Machine" sobre el adaptador manual actual), QR (simulado con
  "Checking Payment"), éxito con "Print Bills" y "Payment Done"; propina, pago mixto y división en
  partes iguales integrados en el mismo panel con los componentes del kit; pestaña Historial con
  filtros por tipo y "Bill Information" con reimpresión.
- E2E: cobro en efectivo con puntos, cobro con tarjeta, QR simulado, reimpresión desde Historial.

### I.5 · Dashboard y notificaciones

- Addon `projectapp_notify`: modelo, generadores de "Dish Ready to Serve" y "Low Stock Alert",
  "Mark all as read", preferencias por usuario (6 booleanos) en `projectapp_ops`.
- POS: Dashboard con saludo, reloj, KPIs, columnas In Progress y Waiting for Payments, Table
  Available por piso, Out of Stock con hora; campana con popover de notificaciones por pestañas;
  sonidos del sistema Waiter ligados a las preferencias.
- E2E: un plato listo en el KDS aparece como notificación en la tablet del mesero.

### I.6 · Empleados, PIN y cuenta

- Addon: `pos_hr` + `hr_attendance`; `hr.employee.waiter_role`, `waiter_shift_start/end`,
  `employee_code`, `joining_date`; `waiter_check_pin`, `waiter_change_pin`, `waiter_forgot_pin`
  (correo); sincronización empleado ↔ usuario para administradores.
- POS: "Select Employee" con PIN y "Start Shift"; "Forgot PIN"; modal "Setting" completo (Employee
  Info, Notification, Security con cambio de PIN, Display con idioma y tema); cronómetro de turno y
  "Log Out" con confirmación; roles desde el empleado.
- E2E: dos meseros se turnan en la misma tablet y cada pedido queda con su empleado.

### I.7 · Superficies sin equivalente en el kit

KDS, Caja (apertura, movimientos, arqueo), Ventas y turno, ROI, Catálogo (precio, impuestos, foto,
favorito, disponibilidad, atributos y `diner_attributes`), Clientes, Facturación y Configuración
(restaurante, marca, plantilla del menú, pisos y mesas, métodos de pago, impuestos, usuarios,
umbrales, ROI, pantalla y sonido). Cada pantalla se compone con `components/kit` y se documenta con
una captura junto a la pantalla del kit que le sirvió de patrón.

### I.8 · Reservas, despensa y fidelización avanzada

- `projectapp_reservations`: modelo, franjas de 30 minutos de 10:00 a 22:00 configurables por sede,
  colisiones por mesa y franja, pre-pedido como `pos.order` en borrador, correo de confirmación,
  estados (confirmada, sentada, no-show, cancelada). POS: timeline mesa × hora, wizard de cuatro
  pasos, "Reservation List" y "Reservation Detail" desde la mesa, estado Reserved en el plano.
- `projectapp_pantry`: ingredientes, categorías del kit (Fresh Produce, Meat & Poultry, Seafood,
  Dairy & Eggs, Dry Goods & Grains), receta por plato, raciones servibles, niveles, proveedores,
  solicitud por correo y lista de solicitudes. POS: pestaña Inventario con Menu / Ingredients /
  Request List, "Detail Dish", wizards "Add New Dish" y "Add New Ingredients", menú "⋯".
- Fidelización: alta de socio desde Clientes, puntos acumulados por pedido, canje en pago (ya en I.4).

### I.9 · Cierre

Unir mesas (`parent_id`), modo oscuro cotejado contra la página "Visual Design – Dark", selector de
idioma con mensajes en inglés, revisión técnica y matriz de cotejo como en H.

## Verificación por oleada

```bash
cd pos && npm test -- --runInBand && npm run typecheck && npm run lint && npx playwright test e2e/<oleada>.spec.ts
docker compose -p odoo-spike -f odoo/compose/docker-compose.yml exec odoo odoo -d <db> -u <addon> --test-enable --test-tags /<addon> --stop-after-init
```

Comparación visual: `pos/scripts/kit-compare.cjs` (se crea en I.1) captura cada ruta a 1194×834 y
deja `pos/kit-compare/<pantalla>.png` junto al PNG del kit para revisión humana.

Contexto: [Inventario del kit](../diseno/2026-09-06-inventario-kit-cloudpos.md) ·
[Arquitectura modular](../arquitectura/2026-09-04-arquitectura-modular.md) · [Índice](../README.md).
