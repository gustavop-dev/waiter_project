# Carta del comensal: saludo en la cabecera y tarjeta con el precio primero

## Cabecera

La cabecera de la carta y de la portada ya no enlaza al nombre del restaurante. Muestra un
saludo y, debajo, la sede y la mesa cuando el QR la trae. El saludo lo fija el administrador
en **Configuración → Diseño del menú → Saludo del menú** (campo `brand_greeting` de
`res.company`, el mismo `saludo` de la marca del Plan G); vacío se muestra «Hola». Con
cuenta se añade el primer nombre del comensal: «Buenas noches, Camila». El elemento no es
clickeable; la navegación sigue en el botón de la derecha. El logo, si existe, acompaña al
saludo como avatar redondo.

## Tarjeta del plato

El orden de la tarjeta sigue el patrón de las apps de domicilios: precio, rebaja, nombre y
tiempo de preparación. La rebaja se muestra como «-X %» y el precio anterior tachado a la
derecha; el tiempo, con reloj y minutos. Ambos datos se editan en **Catálogo → plato →
Atributos** (`tiempoPreparacion` en minutos enteros y `precioAntes` en pesos de lista, dentro
de `diner_attributes`). Sin ellos la tarjeta solo muestra precio y nombre.

`precioAntes` es informativo: el importe cobrado sigue siendo `list_price` más impuestos. Para
que el tachado compare lo mismo, experience aplica al precio anterior los impuestos del
producto y el comensal solo ve la rebaja cuando ese precio anterior es mayor que el actual.
El porcentaje se calcula redondeado; un valor que no sea número positivo desaparece.

En la lista de una categoría, el corazón de favoritos y el botón «+» comparten la misma
columna derecha con el mismo tamaño. El buscador se conserva; el diálogo de filtros por
precio, valoración y disponibilidad se retiró de la carta.

## Verificación

Pruebas: adaptador Odoo de experience (saneo y precio anterior con impuestos), dominio y
formulario del POS (campos nuevos, saludo guardado solo si cambió), componentes del comensal
(cabecera sin enlace, orden de la tarjeta, rebaja y tiempo). Captura real a 390 px con un
plato de la demo configurado temporalmente y restaurado después.
