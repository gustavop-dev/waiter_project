# Revisión del código con Codex (gpt-6-astra) · 2026-09-21

Primera revisión cruzada: Codex (`gpt-6-astra`, esfuerzo alto) revisó la lógica de servidor y de dominio de los commits
`d67946d5..52fbb820` y Claude verificó **cada** hallazgo contra el código antes de aceptarlo. Codex actúa como un colega,
no como autoridad: de 14 hallazgos, uno era falso y uno estaba exagerado.

## Codex no puede ejecutar comandos en esta máquina

Su sandbox (bubblewrap) no logra montar la red aislada: `bwrap: loopback: Failed RTM_NEWADDR: Operation not permitted`.
La causa es de Ubuntu 24.04: `kernel.apparmor_restrict_unprivileged_userns = 1`. Afecta a `read-only` y a
`workspace-write`, así que Codex tampoco puede editar. **Cómo se trabaja por ahora:** se le pasa el diff por la entrada
estándar (`codex exec ... < diff`) y revisa solo ese texto; no ve el resto del repo. Para que trabaje como agente
completo hace falta `sudo` (desactivar esa restricción, que baja la seguridad del sistema, o un perfil de AppArmor solo
para Codex). Es decisión del dueño de la máquina.

Consecuencia práctica: al darle un diff recortado, Codex no ve lo que quedó fuera. Así nació el falso positivo nº 3.

## Resultado

| Nº | Hallazgo | Veredicto |
|---|---|---|
| 3 | Falta la migración de Django de los pagos de reserva | **Falso.** `0023_reservation_deposit_payments` existe, está subida y aplicada; se dejó fuera del diff. |
| 4 | Borrar un piso compartido lo destruye para el otro terminal | **Real, exagerado en parte.** Con la caja del otro terminal *abierta* Odoo ya bloquea cualquier cambio al piso. El fallo real era con esa caja *cerrada*: el piso se borraba para los dos. Arreglado: si el piso es compartido, este terminal solo lo suelta (`detached`). |
| 5 | `Command.link` reemplazaba las mesas en vez de sumar | **Real.** Los comandos del ORM se aplican ahora sobre las mesas actuales (LINK suma, UNLINK quita, SET reemplaza). |
| 6 | Horario guardado sin `overrides` → `KeyError` | **Real.** El horario se normaliza al leer (`clean_schedule`). |
| 7 | Apertura a medianoche (`reservation_open = 0`) se leía como las 10:00 | **Real.** Se quitó el `or 10.0`; los campos ya traen su valor por defecto. |
| 12 | Un plato que dejó de venderse desaparecía del historial | **Real.** El servidor emite la unión de las dos ventanas. Además, entre los platos en cero, el que antes sí se vendía va primero: sin eso, con varios platos en cero, el orden alfabético lo sacaba de la lista de 5 y el arreglo no se habría visto. |
| 13 | Tendencia neutra (1) aunque las últimas 4 semanas no vendieran nada | **Real.** Ahora cae a su tope de −30 %. |
| 14 | Una semana entera sin ventas no contaba como semana en cero | **Real.** Toda semana completa desde la primera venta cuenta; el rango refleja esa variación. |
| 1 | `waiter_deposit_paid` es un RPC público que marca pagado con `sudo()` sin saber quién llama | **Real, latente.** Hoy el POS y el backend del comensal entran a Odoo como `admin`, que ya puede escribir ese campo; no escala privilegios. Será un agujero cuando los terminales usen un usuario con menos permisos (lo correcto en producción). **Pendiente:** decidir un secreto compartido entre servicios. |
| 2 | Cobro doble: pago en línea pendiente + el cajero registra efectivo + la pasarela aprueba | **Real.** El sistema lo marca `needs_review` pero no lo evita. **Decisión del dueño (2026-09-21):** se resuelve al integrar la pasarela de pagos. |
| 8 | La línea de tiempo pinta como abiertos días fuera de la ventana de reservas | Real, cosmético: la línea de tiempo no reserva. Baja prioridad. |
| 9, 10 | Aritmética de fechas al cruzar un cambio de horario (DST) | Real en teoría; Colombia (`America/Bogota`) no tiene horario de verano. Baja prioridad hasta operar en un país con DST. |
| 11 | `validRange` acepta `2026-02-30` | Real, pero el rango sale de `<input type="date">`, que nunca produce esa fecha. Baja prioridad. |

Cada arreglo tiene su prueba, escrita primero y vista fallar antes de arreglar.

## Segunda ronda: Codex revisa los arreglos

Se le devolvieron a Codex los veredictos (con los desacuerdos argumentados) y el diff de los arreglos. Aceptó la
corrección del nº 3 y el alcance más estrecho del nº 4, y encontró **un fallo en un arreglo de Claude**:

- Al soportar `UNLINK` (nº 5) se podía quitar la mesa principal: la reserva pasaba a otra principal, pero el pre-pedido
  en borrador se quedaba en la mesa vieja. Antes ese comando se rechazaba, así que el arreglo abrió un camino nuevo.
- Al verificarlo, el hueco resultó **más amplio** de lo señalado: cualquier cambio de la principal por `write()`
  (`table_id` directo o una lista nueva) dejaba atrás el pre-pedido; la sincronización vivía solo en
  `waiter_set_tables()`. Se movió a `write()` (`_waiter_sync_preorder_table`), que cubre todos los caminos, y se quitó
  la copia duplicada. Prueba: `test_the_draft_preorder_follows_the_main_table_whatever_changes_it`.

El ciclo que funcionó: Codex revisa → Claude verifica contra el código y arregla con prueba primero → Codex revisa los
arreglos. Cada uno encontró algo que el otro no vio.

## Tercera ronda: el lote de velocidad, esqueletos y registro

Codex revisó el segundo lote del día (48 ficheros). De 4 hallazgos, 3 eran reales y 1 no aplicaba:

- **Real — Reservas podía mostrar la grilla de otro día.** Introducido por Claude al evitar peticiones repetidas:
  cargar la fecha A, pasar a B (lenta) y volver a A. La vuelta se saltaba por «A ya cargada» y la respuesta tardía de
  B se instalaba debajo de la fecha A. Arreglado con un número de generación: solo la petición más reciente instala su
  respuesta, y pedir otra cosa deja de dar lo cargado por válido.
- **Real — una respuesta tardía deshacía el `forget` de la salida:** al volver a Reservas no se pedían datos frescos.
  `forget` ahora invalida también la petición en vuelo.
- **Real — `scripts/dev.sh` devolvía éxito aunque fallaran servicios** (`fail` devolvía el código de `printf`), así que
  `scripts/dev.sh up && …` seguía contra un entorno a medias. Ahora termina con 1 si algo falló.
- **No aplica — fuga entre restaurantes por los cachés en memoria.** Codex lo condicionó a cambiar de restaurante sin
  recargar la página. Se verificó que cada instalación del POS atiende a un solo restaurante: la base se fija al compilar
  (`NEXT_PUBLIC_ODOO_DB`). Los cachés van ligados a la sesión de caja y al piso, que dentro de un restaurante es lo
  correcto.

Los dos primeros tienen prueba que falla sin el arreglo.

## Los 10 fallos que ya existían, resueltos

Al correr **todo** `projectapp_ops` aparecían 7 fallos y 3 errores que ya estaban antes de esta revisión. Se habían dado
por «estado de la base». Investigados uno por uno, eran tres cosas distintas:

- **7 — la forma de correr las pruebas, no el código.** El Odoo de desarrollo tiene un `dbfilter` que solo admite la base
  `projectapp`; las pruebas corren en una copia con otro nombre, y Odoo cerraba la sesión de cada petición HTTP
  («Logged into database 'waiter_…', but dbfilter rejects it»). Con `--db-filter` de la copia, las 7 pasan: la protección
  «a un mesero se le niega» sí funciona. Para que no se repita, `scripts/odoo-test.sh` corre las pruebas con lo necesario.
- **1 — un fallo real que las pruebas llevaban tiempo señalando: presets duplicados.** La siembra buscaba los presets
  por su nombre en inglés, pero en una base en español los de Odoo se llaman «Comer en el local», «Para llevar» y
  «Entrega»: no los encontraba y creaba otros tres. La base de desarrollo los tenía desde el 7 de septiembre, con 11
  pedidos y el preset por defecto del terminal apuntando a los duplicados, y **cada restaurante nuevo en español habría
  nacido con los tres duplicados**. Ahora la siembra usa los presets de Odoo por su identificador interno (no depende del
  idioma) y funde los duplicados que encuentre en los originales, repuntando pedidos y terminales; los pedidos conservan
  su prefijo y su número. Aplicado en la base de desarrollo (respaldo previo en `~/waiter-dev-backups/`): quedan los 3
  de Odoo y los 203 pedidos con preset intactos.
- **2 — pruebas que suponían otra cosa.** La numeración de pedidos se probaba con el terminal demo, que en la base de
  desarrollo ya tenía pedidos del día (ahora usa un terminal propio). Y la del PIN seguía pidiendo un token nuevo en cada
  acceso, contra la decisión del 2026-09-08 de conservar el token vigente del turno, que otra prueba ya cubría: se
  contradecían.

Resultado: `projectapp_ops` y `projectapp_reservations` pasan completos, **99 de 99**.

