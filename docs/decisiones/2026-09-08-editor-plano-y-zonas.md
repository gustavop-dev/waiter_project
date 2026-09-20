# Editor del salón y zonas por turno

El administrador edita el piso directamente en Mesas, con caja cerrada. Entrar al editor oculta la navegación operativa; Cancelar descarta el borrador y Guardar persiste el plano completo en una transacción.

Las mesas conservan su identidad de Odoo, número y capacidad. Se ofrecen presets y rectángulos personalizados, con arrastre, cambio de tamaño, giro de 90°, cuadrícula de 20 unidades, zoom, desplazamiento, deshacer y rehacer. Una posición inválida se muestra en rojo y puede seguir ajustándose; no se guarda con colisiones. Paredes y zonas son rectángulos. Las puertas y los pasillos se representan dejando huecos entre paredes.

`restaurant.floor.waiter_plan` guarda paredes y zonas con identificadores estables. `restaurant.table.waiter_zone` vincula cada mesa; al dibujar una zona se asignan las mesas sin zona cuyo centro cae dentro, y al mover una mesa se actualiza su zona. También puede elegirse explícitamente en sus propiedades. `waiter_plan_revision` evita sobrescribir otra edición. El servidor verifica geometría, pertenencia al terminal, números únicos, capacidad, caja cerrada y token de un empleado administrador. Las mesas retiradas se archivan y se rechazan si tienen pedidos abiertos o reservas confirmadas futuras.

La imagen de referencia sigue siendo opcional (PNG/JPG, máximo 10 MB). No reconoce paredes ni mesas automáticamente.

`pos.session.waiter_zone_assignments` guarda varios empleados por zona y piso. Se modifica con caja abierta y PIN de administrador. No se hereda al siguiente turno. **(Reemplazado el 2026-09-19: ver «Reparto habitual de meseros por zona» al final; lo que sigue de este párrafo continúa vigente.)** El salón destaca una zona o las zonas del empleado, muestra sus avisos de mesa y mantiene las demás mesas accesibles para colaborar. Los avisos emergentes y sonidos de platos listos se dirigen a los meseros asignados; las zonas sin asignar y los administradores conservan los avisos generales. La campana continúa permitiendo consultar los avisos compartidos.

Pruebas: modelo Odoo `TestFloorPlan` en una copia de la base, dominio/componentes del POS y `e2e/editor-plano.spec.ts` en escritorio y tablet. El E2E comprueba movimiento bajo el cursor antes y después del zoom, desplazamiento, pellizco táctil, colisiones, capacidad, paredes, zonas, persistencia y cancelación; retira su piso de prueba al terminar.

### Corrección de validación del PIN

Un nuevo acceso con el mismo empleado conserva el token vigente del turno y su vencimiento original; no invalida las pantallas que ya estaban abiertas. La emisión se serializa por empleado. Si la validación caducó o fue revocada, el editor permite confirmar el PIN y guardar sin abandonar el borrador. Los intentos incorrectos siguen sujetos al bloqueo del servidor y no guardan cambios. Cubierto por regresiones de servidor y componente.

### Consistencia visual y escala de referencia

El editor reutiliza `TableShape` del salón, incluidas las sillas y la capacidad. La cuadrícula azul cubre el área visible y acompaña el desplazamiento y el zoom. Las medidas por celdas quedan en Configuración avanzada y la acción de giro se llama Rotar. La imagen tiene un control de tamaño de 25–400%, conserva sus proporciones y guarda `backgroundSize` dentro del plano JSON; el salón usa las mismas dimensiones y origen. Cambiar la escala admite deshacer y cancelar.

### Selección de elementos superpuestos

El panel Capas permite elegir cada mesa, pared, zona o imagen sin depender de cuál está encima. Una zona o imagen seleccionada recibe un contorno arrastrable sobre los demás elementos, sin cambiar el orden visual guardado. El modo Desplazar plano sigue moviendo la cámara. La imagen guarda `x` e `y` junto con su tamaño; los planos anteriores usan origen (0, 0). Mover o redimensionar la imagen participa del historial y Cancelar descarta el borrador. El salón respeta la posición guardada.

### Origen adaptable

El borrador admite coordenadas negativas: mover o dibujar hacia arriba y a la izquierda ya no se detiene en cero. Al guardar se trasladan mesas, paredes, zonas e imagen por el mismo desplazamiento, conservando distancias, tamaños e identificadores. El servidor sigue recibiendo coordenadas no negativas y conserva sus validaciones. Ver todo calcula también los extremos negativos. Se valida el tamaño total del plano antes de guardar.

### El salón encuadra el plano, igual que el editor · 2026-09-19

El salón dibujaba el plano al 100 %, pegado arriba a la izquierda sobre un lienzo mínimo de 1200×800, con la imagen al 60 % de opacidad; el editor lo mostraba encuadrado y con la imagen al 30 %. Lo que el administrador dibujaba no era lo que el mesero veía. Ahora `PlanViewport` mide su contenedor, encuadra los límites reales del contenido (`contentBounds`) y lo centra al abrir, al cambiar de piso y al girar la tablet; un zoom manual se respeta hasta pulsar «Ver todo». La opacidad de la imagen es una sola constante (`BACKGROUND_OPACITY`) para editor y salón.

Una imagen de referencia enorme no puede volver ilegibles las mesas: `salonZoom` encuadra todo salvo que eso deje el zoom por debajo del 60 %; en ese caso encuadra lo que se opera (mesas, paredes, zonas) hasta ese tamaño y la imagen sobrante queda a un desplazamiento. El editor también encuadra al abrir y deja libre la franja de su barra flotante.

### Eliminar pisos

`restaurant.floor.waiter_delete_floor(config, piso, empleado, token)` exige lo mismo que guardar el plano: PIN de administrador y caja cerrada, piso del terminal. Rechaza pisos con pedidos pendientes o reservas futuras en sus mesas, y el último piso activo. Sin ventas en sus mesas, borra el piso y las mesas. Con ventas, borrar dejaría el historial sin mesa: archiva piso y mesas y lo desvincula del terminal, así que para el restaurante desaparece igual y el historial queda intacto. No añade campos: basta reiniciar Odoo. El engranaje de Mesas agrupa los pisos en activos e inactivos, con su número de mesas, interruptor, lápiz y papelera con confirmación.

### Editor con señalización

La lógica de edición no cambió; cambió cómo se llega a ella. Tres zonas: a la izquierda lo que se agrega (mesas dibujadas en miniatura e imagen de referencia), sobre el lienzo una barra flotante con las herramientas y el historial (icono, nombre y tecla), y a la derecha el inspector con las propiedades de lo seleccionado, sus acciones (Rotar, Duplicar, Eliminar) y las capas con icono por tipo. Sin selección, el inspector explica por dónde empezar. Abajo, una pista dice qué hace la herramienta activa y cuenta mesas, paredes y zonas.

Una mesa en rojo ahora dice por qué (`tableProblems`: número repetido, capacidad, encima de otra mesa o de una pared) y la cabecera lleva a la primera con un toque. Atajos: V seleccionar, H mover plano, P pared, Z zona, flechas mueven una celda (cinco con Mayús), R rota, Ctrl+D duplica, Supr elimina, Ctrl+Z / Ctrl+Mayús+Z historial, Esc suelta; no actúan mientras se escribe en un campo. Duplicar una mesa le da el siguiente número libre. En tablet el inspector se superpone al lienzo y aparece al seleccionar algo o al pedir las capas. Los nombres accesibles que usan las pruebas y el e2e se conservaron.

Pruebas: 3 casos nuevos en `TestFloorPlan` (borrado sin historial, archivado con ventas, PIN/caja/pertenencia), dominio (`contentBounds`, `fitZoom`, `salonZoom`, `tableProblems`), popover de pisos, y editor (explicación de mesa inválida y atajos).

### Color de paredes, varias imágenes y fluidez del editor · 2026-09-19

**Paredes con color.** `Wall.color` es opcional (hex de seis cifras, validado en el servidor); sin él se pinta con `WALL_COLOR`, así que los planos anteriores no cambian. El inspector ofrece seis colores de material (pizarra, casi negro, ladrillo, madera, verde de jardinera, gris claro) más un selector libre. Una pared nueva hereda el color de la última. El salón pinta el mismo color.

**Varias imágenes de referencia.** La primera imagen del piso sigue en `floor_background_image` + `backgroundSize`: compatibilidad total con lo ya guardado. Las siguientes (hasta 8) son adjuntos `ir.attachment` del piso; `waiter_plan.images` guarda `{id, attachmentId, x, y, width, height}` y el salón las carga por `/web/image/<id>`, no como base64 dentro del plano. Al guardar, una imagen nueva llega con `data`, una existente con su `attachmentId` (que debe ser de ese piso) y las que ya no están se borran. Un cliente que no envía `images` no las pierde. Borrar el piso borra sus adjuntos. En el editor cada imagen adicional conserva su proporción real, cae en el centro de la vista, se mueve y redimensiona sin deformarse, y aparece en Capas como «Imagen 2», «Imagen 3»… Participan del encuadre, del traslado del origen y del límite de tamaño del plano.

**Por qué se trababa al cambiar un color.** Medido con CPU frenada 4×: 186 ms de trabajo de React por cada tic del selector de color, y 41 pasos de historial por un solo arrastre. El perfil mostró que el 70 % era React recreando todo el editor (paleta, barra, pista, capas con sus iconos) en cada tic; las mesas pesaban poco. Cambios: mesas, paleta, barra, pista y lista de capas memoizadas con manejadores de identidad fija (`useStableCallback`); la validez de las mesas se calcula una vez por cambio de mesas o paredes; el selector de color guarda su valor localmente y publica como mucho un cambio por cuadro; y las ediciones continuas con la misma etiqueta en menos de un segundo son un solo paso del historial. Resultado: 4,8 ms por tic (39 veces menos) y 2 pasos de historial (crear la zona y colorearla).

### Selector de piso reconocible y pantalla partida · 2026-09-19

Las pestañas de piso iban pegadas a la leyenda de colores y sin rótulo: no se leían como «cambiar de piso». `FloorSwitcher` lleva ahora un icono de escaleras y la palabra «Piso», un separador respecto a la leyenda, y el piso activo en azul. Al ser un componente compartido, mejora igual en Reservas y en el paso de mesa de una reserva. Con cuatro pisos o más (o tres en un panel angosto) se pliega a un desplegable rotulado.

**Pantalla partida.** Un botón con icono de columnas, junto al selector, divide el salón en dos paneles lado a lado, cada uno con su piso, como los editores de VS Code. Cada panel (`FloorPane`) es independiente: carga su plano, tiene su barra de zonas, su chip de información, su zoom y su propio selector de piso, que no ofrece el piso del otro panel. La mesa elegida es una sola en toda la pantalla, así que la barra de acciones y los modales siguen siendo los de siempre. Cerrar un panel deja a la vista el otro. Solo aparece con dos pisos o más y desde 768 px de ancho. La preferencia se recuerda por tablet (`localStorage`), no por usuario: es una decisión de dónde está puesta la pantalla.

El zoom inicial baja su piso de legibilidad de 60 % a 45 % (una mesa pequeña queda en unos 50 px, el mínimo tocable): con 60 %, un panel angosto recortaba un plano que cabía entero a un tamaño todavía cómodo.

### Reparto habitual de meseros por zona · 2026-09-19

**Problema.** Repartir meseros exigía caja abierta y no se heredaba: el administrador no podía dejar el salón preparado antes de abrir, y cada turno empezaba sin reparto. Además la opción «solo salía en un piso»: la barra de zonas se escondía por completo en los pisos sin zonas dibujadas, sin explicar por qué.

**Decisión.** Dos niveles:

- **Reparto habitual**, en el piso: `restaurant.floor.waiter_zone_staff` (`{zona: [empleados]}`). Lo guarda `waiter_assign_zone_staff(config_id, floor_id, assignments, employee_id, token)` con PIN de administrador y **sin exigir caja**: es preparación, igual que dibujar el plano. Al guardar el plano se olvidan las zonas borradas.
- **Ajuste del turno**, en `pos.session.waiter_zone_assignments` (como antes). Un turno sin entrada para el piso **hereda** el habitual. `waiter_assign_zones(..., None, ...)` borra el ajuste y el turno vuelve a heredar.

`restaurant.floor.waiter_zone_staff_for(session_id)` es la única lectura: devuelve `{assignments, source: 'plan'|'shift', plan}`. `pos.order.waiter_zone_targets` (a quién le suenan los platos listos) usa esa misma función, así que los avisos siguen siempre al reparto vigente. La validación (zonas existentes, empleados activos de la compañía) es una sola: `checked_staff`.

«Caja abierta» en el servidor es `OPEN_STATES = ('opened', 'opening_control')`, el mismo contrato del POS (`pos/lib/services/session.ts`). Antes el servidor exigía `opened` y rechazaba el reparto de una caja recién creada que el POS ya mostraba como abierta; se encontró verificando en el navegador.

**Interfaz.** `FloorZones` abre el modal `ZoneStaffModal` («Meseros por zona»): una tarjeta por zona con su color y sus mesas, y cada empleado como ficha que se enciende o apaga (meseros primero; quien no es mesero lleva su rol a la vista porque en táctil no hay tooltip). Debajo, quiénes quedan sin zona fija. El botón avisa «N zonas sin mesero». Con caja cerrada edita el habitual; con caja abierta ajusta el turno, y la casilla «Guardar también como reparto habitual» guarda en el piso **y devuelve el turno a heredar** (no le deja una copia que dejaría de seguir cambios futuros). Un turno con ajuste propio ofrece «Volver al reparto habitual». El plano rotula cada zona con sus meseros («Terraza · Sofía, Carlos»); el rótulo se contraescala con `--plan-zoom` (lo publica `PlanViewport`) para leerse a cualquier zoom. Un piso sin zonas le explica al administrador cómo dibujarlas; a un mesero no le muestra nada.

**Pruebas.** Odoo: `test_the_usual_staff_is_prepared_with_cash_closed_and_each_shift_inherits_or_overrides_it`, `test_deleting_a_zone_forgets_who_was_assigned_to_it`. POS: `lib/domain/__tests__/zoneStaff.test.ts`, `components/tables/__tests__/FloorZones.test.tsx`.

**Pendiente.** El reparto habitual es uno por piso; no distingue días ni jornadas (almuerzo/cena). Si hace falta, el siguiente paso son repartos con nombre entre los que elegir al abrir.
