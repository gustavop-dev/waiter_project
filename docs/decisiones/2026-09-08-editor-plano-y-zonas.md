# Editor del salón y zonas por turno

El administrador edita el piso directamente en Mesas, con caja cerrada. Entrar al editor oculta la navegación operativa; Cancelar descarta el borrador y Guardar persiste el plano completo en una transacción.

Las mesas conservan su identidad de Odoo, número y capacidad. Se ofrecen presets y rectángulos personalizados, con arrastre, cambio de tamaño, giro de 90°, cuadrícula de 20 unidades, zoom, desplazamiento, deshacer y rehacer. Una posición inválida se muestra en rojo y puede seguir ajustándose; no se guarda con colisiones. Paredes y zonas son rectángulos. Las puertas y los pasillos se representan dejando huecos entre paredes.

`restaurant.floor.waiter_plan` guarda paredes y zonas con identificadores estables. `restaurant.table.waiter_zone` vincula cada mesa; al dibujar una zona se asignan las mesas sin zona cuyo centro cae dentro, y al mover una mesa se actualiza su zona. También puede elegirse explícitamente en sus propiedades. `waiter_plan_revision` evita sobrescribir otra edición. El servidor verifica geometría, pertenencia al terminal, números únicos, capacidad, caja cerrada y token de un empleado administrador. Las mesas retiradas se archivan y se rechazan si tienen pedidos abiertos o reservas confirmadas futuras.

La imagen de referencia sigue siendo opcional (PNG/JPG, máximo 10 MB). No reconoce paredes ni mesas automáticamente.

`pos.session.waiter_zone_assignments` guarda varios empleados por zona y piso. Se modifica con caja abierta y PIN de administrador. No se hereda al siguiente turno. El salón destaca una zona o las zonas del empleado, muestra sus avisos de mesa y mantiene las demás mesas accesibles para colaborar. Los avisos emergentes y sonidos de platos listos se dirigen a los meseros asignados; las zonas sin asignar y los administradores conservan los avisos generales. La campana continúa permitiendo consultar los avisos compartidos.

Pruebas: modelo Odoo `TestFloorPlan` en una copia de la base, dominio/componentes del POS y `e2e/editor-plano.spec.ts` en escritorio y tablet. El E2E comprueba movimiento bajo el cursor antes y después del zoom, desplazamiento, pellizco táctil, colisiones, capacidad, paredes, zonas, persistencia y cancelación; retira su piso de prueba al terminar.

### Corrección de validación del PIN

Un nuevo acceso con el mismo empleado conserva el token vigente del turno y su vencimiento original; no invalida las pantallas que ya estaban abiertas. La emisión se serializa por empleado. Si la validación caducó o fue revocada, el editor permite confirmar el PIN y guardar sin abandonar el borrador. Los intentos incorrectos siguen sujetos al bloqueo del servidor y no guardan cambios. Cubierto por regresiones de servidor y componente.

### Consistencia visual y escala de referencia

El editor reutiliza `TableShape` del salón, incluidas las sillas y la capacidad. La cuadrícula azul cubre el área visible y acompaña el desplazamiento y el zoom. Las medidas por celdas quedan en Configuración avanzada y la acción de giro se llama Rotar. La imagen tiene un control de tamaño de 25–400%, conserva sus proporciones y guarda `backgroundSize` dentro del plano JSON; el salón usa las mismas dimensiones y origen. Cambiar la escala admite deshacer y cancelar.

### Selección de elementos superpuestos

El panel Capas permite elegir cada mesa, pared, zona o imagen sin depender de cuál está encima. Una zona o imagen seleccionada recibe un contorno arrastrable sobre los demás elementos, sin cambiar el orden visual guardado. El modo Desplazar plano sigue moviendo la cámara. La imagen guarda `x` e `y` junto con su tamaño; los planos anteriores usan origen (0, 0). Mover o redimensionar la imagen participa del historial y Cancelar descarta el borrador. El salón respeta la posición guardada.

### Origen adaptable

El borrador admite coordenadas negativas: mover o dibujar hacia arriba y a la izquierda ya no se detiene en cero. Al guardar se trasladan mesas, paredes, zonas e imagen por el mismo desplazamiento, conservando distancias, tamaños e identificadores. El servidor sigue recibiendo coordenadas no negativas y conserva sus validaciones. Ver todo calcula también los extremos negativos. Se valida el tamaño total del plano antes de guardar.
