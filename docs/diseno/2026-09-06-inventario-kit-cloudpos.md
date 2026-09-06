# Inventario del kit CloudPos frente al POS actual

- **Fecha:** 2026-09-06. **Base de comparación:** rama `feat/05092026-plantillas`, commit `35f2850a`.
- **Kit:** [CloudPos – Restaurant Point of Sale (POS) App UI Kit (Community)](https://www.figma.com/design/d2XiMozQUu4eWf3XUxML2V/) · formato iPad apaisado 1194×834.
- **Material en el repo:** `docs/diseno/pos-kit/pantallas/` (89 PNG a 1x de 92 pantallas; faltan tres de
  reservas, ver §6) y `docs/diseno/pos-kit/textos/` (textos exactos de cada pantalla, extraídos del
  archivo `.fig`). El `.fig` de 215 MB queda fuera del repositorio (`*.fig` en `.gitignore`).
- **Qué más trae el archivo Figma:** página "Visual Design – Dark" (mismas 92 pantallas en oscuro),
  página "Components" (45 frames), "Icons", "Style Guide", "Asset Download" y 744 imágenes incrustadas.
  El conector de Figma quedó agotado (plan Starter: 20 llamadas al mes); iconos y variables se
  recuperan del `.fig` o con un mes de plan Professional cuando toque implementar.

El objetivo de este documento es listar **lo que el kit tiene y el POS no**, con la entidad de datos
que implica y dónde se resuelve (interfaz del POS, addon `projectapp_ops`, módulo estándar de Odoo 19
Community, o `experience/`). Los módulos y campos de Odoo citados se verificaron contra la imagen
`odoo:19` del proyecto. El detalle pantalla por pantalla está en los informes de lectura del
scratchpad de la sesión y se resume aquí.

## 1. Forma general del kit y diferencias estructurales

| Aspecto | Kit CloudPos | POS actual |
|---|---|---|
| Dispositivo | Tablet apaisada 1194×834, un solo layout | Escritorio y tablet, PWA, densidad configurable |
| Navegación | Barra superior con 6 pestañas: Dashboard · Order · Table · Reservation · History · Inventory; campana; chip de usuario | Sidebar de 8 módulos (salón, ventas, catálogo, inventario, clientes, automatización, facturación, configuración) + carril estrecho en toma de pedido |
| Roles | Solo "Waiter" visible; no hay pantallas de cajero ni administrador | Mesero / cajero / admin con rutas filtradas por rol |
| Patrones | Modales grandes con split view, wizards con stepper, toasts oscuros, teclado numérico en pantalla, chips de filtro con conteo | Drawers laterales, paneles fijos, sin toasts |
| Impuestos y moneda | Un impuesto único "Tax 12 %", moneda US$ | Impuestos por producto desde Odoo (IVA 19 %, impoconsumo 8 %), COP, propina |
| Idioma | Inglés | Español (next-intl, locale fijo) |
| Cocina | No hay pantalla de cocina; solo notificaciones "Dish Ready to Serve" | KDS completo (`/kds`) |
| Caja | No hay apertura, cierre ni arqueo | Caja completa (`/caja`, `/ventas`) |

Implementar el kit "tal cual" cubre la operación del mesero. Todo lo que ya tenemos y el kit no
dibuja (§4) hay que diseñarlo con el lenguaje visual del kit: sus componentes, sus colores y sus
patrones de modal y wizard.

## 2. Matriz por módulo: qué tiene el kit, qué tenemos, qué falta

Convención: **SÍ** = existe con la misma función; **PARCIAL** = existe algo distinto o incompleto;
**NO** = no existe.

### 2.1 Autenticación (4 pantallas)

| Kit | Tenemos | Falta | Dónde |
|---|---|---|---|
| Selector de empleado con foto, nombre y horario de turno del día | NO. Login por correo y contraseña de Odoo | Lista de empleados del terminal con foto y turno | `pos_hr` (Community) da empleados por terminal; el turno del día es un campo nuevo (no hay `planning` en Community) |
| PIN de 6 dígitos con teclado en pantalla y "Start Shift" | NO (código de 6 dígitos solo para activar cuenta o recuperar contraseña) | Login por PIN que abre turno | `hr.employee.pin` existe; `pos_hr` valida el cajero por PIN. La sesión web de Odoo sigue necesitando un usuario técnico por terminal |
| Forgot PIN por correo (Request PIN → Check your email → Resend) | PARCIAL (mismo flujo para contraseña) | Reenvío de PIN en vez de código de activación | Reusar `projectapp_ops/controllers/auth.py` |

### 2.2 Dashboard (3 pantallas)

| Kit | Tenemos | Falta | Dónde |
|---|---|---|---|
| Saludo, reloj y fecha en vivo, botón "Create New Order" | PARCIAL (saludo por hora solo en login) | Pantalla de inicio del mesero | POS |
| KPIs Total Earning · In Progress · Ready to Served · Completed | PARCIAL (`/operacion` tiene 5 KPIs distintos) | KPIs por estado de pedido del turno | POS sobre `pos.order` + cursos |
| Columnas "In Progress" y "Waiting for Payments" con tarjetas (Order#, tipo, mesa, cliente, progreso %, nº ítems) | PARCIAL (tabla de pedidos del turno) | Tarjeta de pedido con progreso % y estado "Waiting for Payment" | POS. El % se deriva de líneas servidas / total; "Waiting for Payment" es nuestra bandera `billing` |
| Panel "Table Available" por piso (mesa, capacidad) | PARCIAL (salón) | Lista compacta de mesas libres | POS |
| Panel "Out of Stock" con hora de reposición ("Available: 03:00 PM") | PARCIAL (KPI agotados en inventario, chip agotado en tarjeta) | Hora estimada en que vuelve el plato | Campo nuevo `product.template.available_from` en `projectapp_ops` |
| Popover de notificaciones: pestañas All / Inventory / Kitchen, "Mark all as read", "Low Stock Alert" con botón "Request Ingredients" y "Dish Ready to Serve" con mesa | NO (badges del sidebar y alertas por excepción en `/operacion`) | Centro de notificaciones con estado leído y acción | Modelo nuevo `waiter.notification` (tipo, título, cuerpo, entidad, acción, leído, usuario) en `projectapp_ops`; origen: `ready_date` del curso y umbrales de stock |

### 2.3 Order: listado, detalle y añadir ronda (6 pantallas)

| Kit | Tenemos | Falta | Dónde |
|---|---|---|---|
| Buscador por Order ID o nombre de cliente | PARCIAL (buscar por mesa, pedido o mesero en salón) | Búsqueda por cliente | POS |
| Filtros All / In Progress / Ready to Served / Waiting for Payment con conteo; Sort by Latest / Oldest / Order Type | PARCIAL (filtros de la tabla del turno) | Estados "Ready to Served" y "Waiting for Payment" como filtros | POS; el estado se deriva del curso y de la bandera `billing` |
| Tarjeta con tabla Items / Qty / Price y **checkbox por línea** (marcar servido) | NO (servido se marca por curso en el KDS) | Marcar servido línea a línea desde el mesero | Hoy `served_date` vive en el curso (`projectapp_kitchen`). Para línea a línea hace falta `served_date` en `pos.order.line` |
| "Pay Bills" deshabilitado hasta que todo esté servido | NO (se cobra en cualquier momento) | Regla de negocio: cobrar solo con todo servido | POS (decisión: mantener cobro libre para cajero) |
| Detalle con líneas **agrupadas por estado de cocina** (Waiting to cooked / In Progress / Served) y "Cancel order" solo en espera | PARCIAL (cursos disparado / listo / entregado) | Vista agrupada y cancelación de líneas no enviadas | POS; los grupos coinciden con nuestros cursos |
| "+ New Order" = añadir ronda a un pedido abierto, con "Save and Send to Kitchen" | SÍ (enviar a cocina crea un curso nuevo) | Solo la presentación como modal | POS |
| "Add More (n)" en la tarjeta de producto y "Available on HH:MM" | PARCIAL | Contador en la tarjeta y hora de reposición | POS + `available_from` |
| Toast "Awesome! Order #DI001 is in!" | NO | Sistema de toasts | POS (componente nuevo) |

### 2.4 Crear pedido: Dine In y Take Away (18 pantallas)

| Kit | Tenemos | Falta | Dónde |
|---|---|---|---|
| Wizard modal con pasos Customer Information → Select Table → Select Menu → Order Summary | PARCIAL (mesa desde el salón → toma de pedido) | Flujo guiado en modal | POS |
| **Order Type: Dine In / Take Away** con numeración DI### / TA### | NO (solo mesa; "Domicilio" se muestra pero no se crea) | Tipos de pedido y numeración por tipo | Odoo 19 trae `pos.preset` (Dine In / Take Away / Delivery, con `service_at` en `pos_self_order`). Falta usarlo desde el POS y derivar el prefijo del `tracking_number` |
| "How many people" editable, "Baby Chair" Sí/No, "Customer Name" libre | PARCIAL (`customer_count` = sillas de la mesa, no editable; sin cliente) | Comensales editables, silla de bebé, nombre libre | `customer_count` y `floating_order_name` existen en `pos.order`. `baby_chair` es campo nuevo en `projectapp_ops` |
| Mapa de mesas con formas y sillas, leyenda Available / Not Available / Reserved / Can't Select, "Info Reservation" | PARCIAL (rejilla fija de 5 columnas, 9 estados) | Plano libre con formas; estado reservado | Ver §2.5 |
| Modal **Add Order** con "Base Price", grupos **Add On** obligatorios (radio, sobreprecio) y opcionales (múltiple) | NO (solo nota de texto libre por línea) | Modificadores estructurados con precio | Odoo: atributos de producto con `price_extra` (selección única) y `product.combo` (múltiple). El POS hoy ignora `attribute_line_ids` |
| Línea del carrito con "Addition: …", "Note: …", lápiz para editar, stepper y borrar | PARCIAL (nota, stepper, borrar) | Add-ons en la línea y edición posterior | POS + `pos.order.line.attribute_value_ids` |
| Resumen con Sub Total / Tax 12 % / Total Payment y "Create Order and Sent to Kitchen" | SÍ (con impuestos reales de Odoo) | Solo presentación | POS |
| Take Away cobra antes de enviar a cocina: Payment con Cash / Card / QR, "Input Member Code" | PARCIAL (cobro en salón) | Cobro dentro del flujo de creación | POS |
| Pantalla "Payment Successful" con Customer Pays, Change, "Print Bill" | SÍ (recibo con cambio) | Presentación | POS |

### 2.5 Mesas y editor de salón (19 pantallas)

| Kit | Tenemos | Falta | Dónde |
|---|---|---|---|
| Plano libre por piso con formas (cuadrada 2 sillas, rectangular H 6, rectangular V 8), scroll horizontal | NO (rejilla `grid-cols-5` fija; `position_h/v` calculados) | Plano con posición y tamaño reales | `restaurant.table` ya tiene `position_h`, `position_v`, `width`, `height`, `shape` (square / round), `color`, `seats`. Solo hay que leerlos y pintarlos |
| Estados Available / Not Available (con Order# e "In Progress") / Reserved (con hora) | PARCIAL (9 estados, sin reservado) | Estado "Reserved" | Depende de reservas (§2.6) |
| Hasta 3 pisos como pestañas; con 4+ dropdown "Floor #N" y chip "Floor Info: Floor Type Indoor" | PARCIAL (pestañas) | Tipo de piso Indoor / Outdoor | Campo nuevo `floor_type` en `restaurant.floor` (`projectapp_ops`) |
| Barra flotante "Table Selected: A11 ✕ · Info Reservation · Detail Table" | NO | Selección de mesa con acciones | POS |
| "Table Detail": estado por plato, "Change Table", "+ New Order", "Proceed to Payment" | PARCIAL (panel de cuenta) | Estado por plato y mover pedido | POS; mover = `write table_id` en `pos.order` |
| **Change Table** (Current → New, Confirm) | NO | Mover pedido de mesa | POS + addon (validar destino libre) |
| Engranaje → "+ Add New Floor", lista de pisos con lápiz y toggle activo | PARCIAL (crear piso solo con nombre; editar mesa número/capacidad/activa) | Activar/desactivar piso, editar tipo | `restaurant.floor.active` existe |
| Wizard **Add New Layout Table**: Floor Number, Floor Type, subir imagen del plano ("Analyzing Your Layout"), cuadrícula, paleta de 3 plantillas arrastrables, mover, rotar, "Drag here to delete", nombre de mesa al soltar, resumen de éxito | NO | Editor de plano con drag and drop | POS (editor nuevo). Odoo guarda posición y tamaño; `floor_background_image` existe para la imagen. **Rotación no existe en Odoo**: campo nuevo o descartar. "Analyzing Your Layout" es decorativo en el kit: no hay análisis real |
| Edit Layout Table (pestañas Table Info / Layout Arrange) | NO | Edición del plano existente | POS |
| Unir mesas ("Animate Join Table" en capas) | NO | Mesas unidas | `restaurant.table.parent_id` existe en Odoo 19 |

### 2.6 Reservas (11 pantallas, 8 exportadas)

| Kit | Tenemos | Falta | Dónde |
|---|---|---|---|
| Home: **timeline mesa × hora** (10:00 a 22:00 en pasos de 30 min), tarjetas con ID, cliente y personas, selector de piso y de día, "+ Add New Reservation" | NO | Todo el módulo | **Modelo nuevo**. Odoo Community no trae reservas de restaurante (`appointment` es Enterprise). Propuesta: `waiter.reservation` en `projectapp_ops` para que el salón lea el estado de la mesa |
| Wizard: Reservation Info → Select Table → Add Dishes → Reservation Summary | NO | | |
| Modal fecha + franja de 30 min ("Not Selected", Apply) | NO | | |
| Select Table con leyenda Available / Reserved / Can't Select y hora de la reserva existente | NO | | |
| Add Dishes con "Skip for now" (platos pre-pedidos con add-ons y nota) | NO | Pre-pedido ligado a la reserva | `pos.order` en borrador ligado a la reserva |
| Summary: Reservation ID, Customer Name, Date, Time, Table Number, Baby Chair, "Create Reservation" | NO | | |
| Toast "Reservation Confirmed! … We've sent the details to your email" | NO | Correo de confirmación al cliente | Addon + `mail` |
| Desde la mesa: "Reservation List" (Cust Name / Date / Time / Detail) y "Reservation Detail" (ID, hora inicio-fin, mesa, cliente, People, Baby Chair, platos, total) | NO | | |

Campos de la reserva que implica el kit: id `RV###`, cliente (nombre, correo; el teléfono no aparece),
fecha, hora de inicio, hora de fin o duración, personas, silla de bebé, mesa, piso, platos
pre-pedidos, total. El kit **no** tiene estado de reserva (confirmada, sentada, no-show, cancelada),
depósito ni notas: hay que añadirlos.

### 2.7 Pago (9 pantallas)

| Kit | Tenemos | Falta | Dónde |
|---|---|---|---|
| Entrada desde "Table Detail" con todo servido → "Proceed to Payment" | PARCIAL (cobro desde el panel de cuenta) | Presentación | POS |
| **Member Code** → socio con puntos, "100 points = US$ 1", toggle "Use Points?", línea "Member Points" negativa | NO | Fidelización por puntos | `loyalty` + `pos_loyalty` (Community, verificados): programa tipo "Loyalty Cards", tarjeta con código y puntos, regla de canje |
| Métodos Cash / Card / QR Code como segmented control | PARCIAL (métodos de `pos.payment.method`, sin QR) | QR | `pos_online_payment` + proveedor de QR colombiano (Bre-B / Nequi vía pasarela). No hay proveedor integrado hoy |
| Cash: display, montos rápidos $20 $50 $100 $200, teclado numérico, "Pay Now" | PARCIAL (importe libre y cambio) | Teclado y montos rápidos (en COP: 10.000 / 20.000 / 50.000 / 100.000) | POS |
| Card: temporizador "Complete payment in 00h 24m 54s", "Confirm Pay" → **Move to EDC Machine** (esperar datáfono) | PARCIAL (diálogo manual de datáfono con voucher) | Pantalla de espera y temporizador | POS; el adaptador `lib/payments/terminal.ts` sigue manual hasta integrar Bold u otro |
| QR: comercio + imagen QR + "Confirm Pay" → "Checking Payment" → éxito | NO | | Proveedor externo |
| Éxito: Total, Payment Method, Customer Pays, Change, "Print Bills", "Payment Done" | SÍ (recibo) | Presentación | POS |

El kit **no** tiene dividir cuenta, propina, cargo de servicio, descuento manual, pago mixto ni
envío del recibo por correo. Nosotros ya tenemos propina, pago mixto y división en partes iguales:
hay que dibujarlos en el lenguaje del kit (§4).

### 2.8 Historial (2 pantallas)

| Kit | Tenemos | Falta | Dónde |
|---|---|---|---|
| Buscador, filtros All / Dine In / Take Away, lista con Order#, fecha, tipo, mesa, cliente, Total Sales | PARCIAL (tabla del turno en `/ventas`, historial por cliente) | Pantalla de historial con detalle | POS sobre `pos.order` pagados |
| "Bill Information": líneas (unitario × cantidad), Sub Total, Tax, Total, **Print Invoice** | PARCIAL (recibo solo al cobrar; botón Imprimir deshabilitado) | Reimpresión | POS (`Receipt.tsx`) |

El kit no muestra cajero, método de pago, cambio ni reembolso. Nuestro `/facturacion` (factura de
Odoo) no tiene equivalente en el kit.

### 2.9 Inventario (11 pantallas + pestaña "Request List" sin captura)

| Kit | Tenemos | Falta | Dónde |
|---|---|---|---|
| Pestañas Menu · Ingredients · Request List | PARCIAL (`/catalogo` y `/inventario` separados, solo existencias) | Inventario por ingredientes | Ver abajo |
| Menu List: filtros Dishes Status / Stock Level (Low, Medium, High, Empty) / Category con conteo, "Reset Filter"; tarjeta con "Can be served: N" y nivel | NO | Raciones servibles calculadas desde la receta | `mrp.bom` (Community) por plato; "Can be served" = mínimo de stock del ingrediente / cantidad de receta |
| Detail Dish: receta (ingrediente, cantidad, unidad, nivel de stock) | NO | Receta por plato | `mrp.bom.line` + `uom` |
| Add New Dish: Dish Name, Dish Category (chips), Dish Description, Price; paso 2 filas Ingredients Name / Quantity / Unit | PARCIAL (`ProductForm` tiene nombre, precio, impuesto, categorías, descripción, imagen, disponible, favorito, existencias) | Receta en el alta; el kit no muestra imagen ni costo (pantalla cortada) | POS + `mrp.bom` |
| Ingredients: filtros Stock Level y Category (Fresh Produce, Meat & Poultry, Seafood, Dairy & Eggs, Dry Goods & Grains); filas con foto, nombre, categoría, "Stock: 1.5 kg", nivel, SUPPLIER, STATUS (Need Request / Normal / Good), menú "⋯" Edit / Request / Delete | NO | Ingredientes como productos con proveedor y umbrales | Ingrediente = `product.product` almacenable no vendible; proveedor = `product.supplierinfo` (`purchase`); niveles Low / Medium / High desde `stock.warehouse.orderpoint` (mínimo y máximo) |
| Request Ingredients → toast "Request Sent! … sent to the supplier" | NO | Solicitud de compra al proveedor | `purchase.order` en borrador (RFQ) por correo; "Request List" = lista de RFQ con estado |
| Add New Ingredients: nombre, categoría (chips), Initial Stock, Unit Measurement (Bunch, Clove, Gram, Kilogram, Pieces, Slice), foto; paso 2 selección de proveedor en grid | NO | Alta de ingrediente | POS + Odoo |

Este es el bloque más grande de modelo de datos nuevo. Odoo Community trae todo lo necesario
(`mrp`, `purchase`, `uom`, `stock`), pero activar `mrp` implica órdenes de fabricación implícitas para
consumir ingredientes al vender: hay que decidir si el consumo se hace por BOM tipo "kit" en la
venta del POS, que es lo habitual en restaurantes.

### 2.10 Cuenta del empleado (9 pantallas)

| Kit | Tenemos | Falta | Dónde |
|---|---|---|---|
| Modal "Setting" con pestañas Employee Info · Notification · Security · Display | NO (no hay pantalla de cuenta) | Todo el módulo | POS |
| Employee Info: Employee ID, foto, nombre, "Your shift today", Full Name, Phone, Email, Address, Joining Date, Access Role, Employment Status, Manager | NO | Perfil de empleado | `hr.employee` tiene teléfono, correo, dirección privada, `parent_id` (manager), `employee_type`. Fecha de ingreso y turno del día son campos nuevos |
| Notification: 3 canales (Kitchen Update, Inventory, System Update) × 2 toggles (Pop up information, Notification sound) | PARCIAL (estación de sonido y volumen por dispositivo) | 6 preferencias por usuario | Campos en `res.users` (`projectapp_ops`) |
| Security: Change PIN (6 casillas, sin PIN actual) → "Change PIN Successful!" | NO | Cambio de PIN | `hr.employee.pin` |
| Display: Language (11 idiomas) y Color Mode (System / Light / Dark) | NO (español fijo, tema claro) | Idioma por usuario y tema oscuro | `res.users.lang` + mensajes de next-intl (hoy solo `es`); tema con la página "Visual Design – Dark" del kit |
| Tarjeta "Time" con cronómetro de turno y "Log Out" habilitado solo al terminar; "Confirm Log Out?" | PARCIAL (logout existe sin botón) | Cronómetro de turno, botón de salir con confirmación | POS + `hr_attendance` (Community) si se quiere registrar entrada y salida |

El kit **no** tiene resumen de turno al salir (ventas, efectivo). Nuestro cierre de caja se mantiene
aparte y hay que dibujarlo.

## 3. Entidades y campos nuevos, con su destino

Resumen de modelo de datos que el kit obliga a añadir o a empezar a usar. "Existe" significa que Odoo 19
Community ya tiene el campo y hoy no lo usamos.

| Entidad | Campo o concepto | Estado en Odoo 19 | Acción |
|---|---|---|---|
| Empleado | PIN de 6 dígitos | Existe: `hr.employee.pin`, módulo `pos_hr` | Instalar `pos_hr`, login por PIN |
| Empleado | Turno del día (inicio y fin) | No (`planning` es Enterprise) | Campo nuevo `waiter_shift_start/end` o `hr_attendance` |
| Empleado | Employee ID, Joining Date, Employment Status, Manager | Parcial (`parent_id`, `employee_type`) | Campos nuevos para ID visible y fecha de ingreso |
| Usuario | Preferencias de notificación (6 booleanos), idioma, tema | `lang` existe | Campos nuevos en `res.users`; tema en cliente |
| Pedido | Tipo Dine In / Take Away / Delivery | Existe: `pos.preset` + `service_at` | Sembrar presets y usarlos desde el POS |
| Pedido | Prefijo DI / TA / DE | Derivable del preset | Presentación |
| Pedido | Nombre libre de cliente | Existe: `floating_order_name` | Usar |
| Pedido | Comensales editables | Existe: `customer_count` | Editar desde el POS |
| Pedido | Silla de bebé | No | `baby_chair` en `projectapp_ops` |
| Pedido | Progreso %, estados Ready to Served / Waiting for Payment | Derivable (cursos + bandera `billing`) | Cálculo en cliente; persistir `billing` en Odoo si se quiere compartir entre tablets |
| Línea | Add-ons con sobreprecio | Existe: atributos con `price_extra`, `product.combo` | Leer `attribute_line_ids` y combos en el POS |
| Línea | Servido línea a línea, cancelar en espera | Parcial (por curso) | `served_date` por línea en `projectapp_kitchen` si se quiere el checkbox del kit |
| Producto | Hora de reposición cuando está agotado | No | `available_from` (Datetime) en `projectapp_ops` |
| Producto | "Chef Recommendation" | Existe: `is_favorite` o categoría | Mapear a favorito |
| Mesa | Posición, tamaño, forma, color, sillas | Existe | Pintar el plano real; editor de arrastre |
| Mesa | Rotación | No | Campo nuevo o descartar (recomiendo descartar) |
| Mesa | Unir mesas | Existe: `parent_id` | Usar más adelante |
| Piso | Tipo Indoor / Outdoor, imagen de plano, activo | Parcial (`floor_background_image`, `active` existen) | `floor_type` nuevo |
| Reserva | Todo | No existe en Community | Modelo `waiter.reservation` en `projectapp_ops` con estado, teléfono y notas además de lo que dibuja el kit |
| Fidelización | Código de socio, puntos, canje | Existe: `loyalty`, `pos_loyalty` | Instalar y configurar programa "Loyalty Cards" |
| Pago | QR con verificación | Parcial: `pos_online_payment` | Proveedor externo pendiente |
| Pago | Temporizador de caducidad | No | Cliente |
| Ingrediente | Producto con categoría, stock, unidad, foto | Existe (`product`, `stock`, `uom`) | Convención: no vendible, almacenable |
| Ingrediente | Proveedor | Existe: `product.supplierinfo` (`purchase`) | Instalar `purchase` |
| Ingrediente | Niveles Low / Medium / High / Empty, estado Need Request | Existe: `stock.warehouse.orderpoint` (mín y máx) | Derivar niveles de los umbrales |
| Ingrediente | Solicitud al proveedor, Request List | Existe: `purchase.order` | RFQ por correo |
| Plato | Receta (ingrediente, cantidad, unidad), "Can be served" | Existe: `mrp.bom` tipo kit | Instalar `mrp`; cálculo de raciones |
| Notificación | Tipo, título, cuerpo, entidad, acción, leído | No | `waiter.notification` en `projectapp_ops` |

## 4. Lo que tenemos y el kit no dibuja

Hay que rediseñar estas superficies con los componentes del kit, porque el kit no las contempla:

- **KDS** (`/kds`): comandas, estaciones, cronómetros, alarmas. El kit solo notifica "Dish Ready".
- **Caja**: apertura con efectivo inicial, entradas y salidas, arqueo con diferencia, cierre forzado.
- **Ventas y turno** (`/ventas`), **ROI** (`/automatizacion`) y estados vacíos de IA.
- **Catálogo** con precio, impuestos, foto, favorito, disponibilidad y categorías con estación de cocina.
  El "Menu List" del kit es de inventario, sin precio ni foto editable.
- **Clientes** (`res.partner` con documento) y **Facturación** (factura de Odoo con PDF).
- **Configuración**: restaurante, marca (Plan G), plantilla del menú (Plan H), pisos y mesas, métodos de
  pago, impuestos, usuarios e invitaciones, umbrales de alerta, supuestos del ROI, pantalla y sonido.
- **Roles cajero y administrador** y sus rutas.
- **Cobro**: propina, pagos mixtos, división en partes iguales, datáfono manual con voucher, cobro de
  pedidos del comensal, descuento del comensal (`discount`) visible.
- **Alertas por excepción** con acciones (Voy, Cortesía, Cobrar) y **llamadas del comensal**
  (`waiter_call`), que el kit no conoce.
- **Impuestos reales por línea** y moneda COP sin decimales: el kit asume 12 % único y US$.

## 5. Lo que el kit dibuja pero no implementaremos como está

- **"Pay Bills" solo con todo servido.** Bloquea al cajero. Propuesta: mantener cobro libre y usar la
  regla del kit solo como aviso.
- **Take Away cobra antes de cocinar.** Válido para mostrador; conviene permitir también cobrar
  después, como en mesa.
- **"Analyzing Your Layout"** al subir la imagen del plano: no hay análisis real detrás. Subir la
  imagen como fondo (`floor_background_image`) y dibujar la cuadrícula encima.
- **Rotación de mesas**: Odoo no la guarda. Recomiendo omitirla.
- **Impuesto único 12 %**: se reemplaza por los impuestos de Odoo por línea.
- **Idioma inglés y 11 idiomas**: arrancamos en español; el selector queda para más adelante.

## 6. Huecos e inconsistencias del propio kit

- Faltan tres frames de reservas en la exportación: "Fill Customer Information", "Customer
  Information Filled" y "Select Table" sin selección. El paso 1 del wizard de reservas se
  infiere del resumen y del toast (nombre, personas, silla de bebé, correo).
- No hay captura de "Request List" (inventario), del formulario de solicitud a proveedor, de
  "Edit Ingredients", de la selección de mesa destino en "Change Table", ni del segundo grupo
  "Add On · Optional".
- "Log Out Shift End" no tiene resumen de turno; es el perfil con el cronómetro en cero.
- Pantallas cortadas por scroll: paso 1 de "Add New Dish" bajo Price (no se ve si hay imagen, costo o
  disponibilidad) y paso 1 de "Add New Ingredients" bajo la foto.
- Datos de muestra que no cuadran: totales, mesa B3 frente a A11 para el mismo pedido, "Eva" y
  "Eve", "6 Items" y "3 Items", cambio mal calculado. Erratas: "Reccomendation", "Sent to Kitchen",
  "Vegatable", "Hapus Ingredients" (indonesio), "yor New PIN".
- Categorías de ingrediente del formulario (Vegetable, Meat, Dairy, Spices, Seafood, Oil, Fruits) no
  coinciden con las del filtro (Fresh Produce, Meat & Poultry, Seafood, Dairy & Eggs, Dry Goods).

## 7. Decisiones pendientes antes de planificar

1. **Login.** ¿Selector de empleado con PIN (`pos_hr`) reemplaza al correo y contraseña de Odoo, o
   convive como "cambiar de empleado" dentro de una sesión ya abierta? Recomiendo lo segundo:
   la sesión de Odoo la abre el terminal y el PIN identifica al mesero.
2. **Reservas.** Es un módulo nuevo completo sin base en Odoo Community. ¿Entra en la primera
   oleada o se deja para después de mesas y pedidos?
3. **Fidelización.** `pos_loyalty` existe; ¿activamos puntos ahora o dejamos solo el campo de
   búsqueda de cliente?
4. **Inventario por ingredientes.** Implica `mrp`, `purchase` y `uom`, más convenciones de
   producto. Es el bloque más caro. ¿Se hace completo, o primero solo "Menu List" con niveles
   sobre las existencias actuales?
5. **Pago QR.** No hay proveedor; ¿se dibuja la pantalla con el flujo simulado, como el pago del
   comensal, o se omite hasta tener pasarela?
6. **Delivery.** El kit deja ver "DE001" pero no lo diseña. ¿Se incluye el tercer preset ahora?
7. **Superficies sin equivalente en el kit** (§4). Propongo diseñarlas con la página "Components" del
   kit y validarlas contigo antes de codificar.

## 8. Orden de implementación propuesto

1. **Sistema de diseño**: tokens (colores, tipografía, radios), iconos SVG del `.fig`, componentes
   base del kit (top bar, chips, tarjetas, modales, wizard, toasts, teclado numérico). Modo oscuro
   desde el inicio, porque el kit lo trae.
2. **Mesas**: plano real con los campos de Odoo, estados, barra de selección, detalle de mesa,
   cambiar de mesa, editor de plano.
3. **Pedidos**: Order con filtros y tarjetas, wizard de creación con presets Dine In / Take Away,
   comensales, silla de bebé, nombre libre, add-ons desde atributos, rondas, detalle agrupado.
4. **Pago e historial**: pantalla de pago del kit con nuestros métodos, propina y división; éxito con
   impresión; historial con reimpresión.
5. **Dashboard y notificaciones**: KPIs, tarjetas, agotados con hora, centro de notificaciones.
6. **Cuenta del empleado y login por PIN**.
7. **Rediseño en el lenguaje del kit** de KDS, caja, ventas, catálogo, clientes, facturación y
   configuración.
8. **Reservas, fidelización e inventario por ingredientes**, según las decisiones del §7.

Contexto: [Inventario de vistas del rediseño](2026-09-04-inventario-vistas-rediseno.md) ·
[Índice](../README.md).
