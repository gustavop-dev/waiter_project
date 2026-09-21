# ¿Quitar el frontend de Odoo y meterlo dentro de Django? · 2026-09-21

- **Estado:** análisis, pendiente de decisión del dueño
- **Pregunta del dueño:** «Tenemos tres backends (Odoo, registro, experiencia). Si ya construimos nuestro frontend en
  React, ¿podemos quedarnos solo con el backend de Odoo y eliminar su frontend? ¿Podemos embeber Odoo dentro de nuestro
  Django, para no tener dos servicios y que Django sea el orquestador?»
- **Método:** Claude analizó el código y las decisiones ya documentadas; Codex (`gpt-6-astra`) dio una opinión
  independiente con los mismos hechos, sin ver las conclusiones de Claude. **Los dos llegaron al mismo veredicto.** Cada
  afirmación técnica de abajo se verificó contra el código del repositorio.

## Hechos verificados

- El POS habla con Odoo por `/web/dataset/call_kw` y `/web/session/{authenticate,destroy,get_session_info}`, a través
  de la reescritura `/odoo/:path*` de Next. Usa **104** métodos distintos de Odoo, muchos de nuestros addons.
- `experience` habla con Odoo por `/web/dataset/call_kw` y `/web/session/authenticate`.
- Esos endpoints viven en el módulo **`web`** de Odoo, el que parece «su frontend».
- Nuestros addons usan procesos propios de Odoo: tareas programadas (`ir.cron` en `projectapp_notify`) y el bus de
  avisos en tiempo real (`projectapp_bus`).
- Ya se hizo la limpieza de módulos: de 69 a 45 en una base limpia, con los menús sobrantes ocultos
  ([`2026-09-04-multi-tenant.md`](../decisiones/2026-09-04-multi-tenant.md)).

## 1. ¿Eliminar el frontend de Odoo? — **En parte: dejar de exponerlo sí; borrarlo no**

- **No se puede borrar sin romper la integración.** El «frontend» y la API no son piezas separadas en Odoo: el módulo
  `web`, que trae la interfaz, trae también los endpoints JSON-RPC por los que hablan el POS y `experience`. Los módulos
  de negocio (`point_of_sale`, `account`, `stock`, `mail`) empaquetan juntos modelos, vistas y recursos.
- **No haría nada más rápido.** El JavaScript de la interfaz de Odoo no se ejecuta en los procesos de Python ni se sirve
  si nadie abre `/odoo`. La lentitud medida venía de hacer 18–25 viajes por pantalla, no de lo que Odoo tiene instalado.
- **Desmontarlo a mano cuesta caro:** referencias rotas, fallos al instalar o actualizar módulos, reportes rotos, y
  repetirlo en cada versión de Odoo.
- **Ya es headless.** Nadie usa su interfaz y los menús sobrantes ya están ocultos.

**Lo que sí conviene:** en producción, que el proxy inverso **solo deje pasar las rutas que usamos** (sesión, RPC,
imágenes, bus en tiempo real) y bloquee la interfaz (`/odoo`, `/web` como aplicación), el gestor de bases
(`/web/database/*`) y los endpoints públicos de autoservicio (`pos_self_order`, que en el spike filtraba los
identificadores de las mesas). Ojo: no se puede bloquear `/web` completo, porque de ahí cuelga la API.

## 2. ¿Embeber Odoo dentro de Django? — **No**

Es posible importar Odoo como librería de Python, pero no convierte los dos en un solo sistema; cambia un límite de
servicio visible por problemas de ejecución más difíciles:

- **Odoo es un entorno de ejecución completo**, no un conjunto de modelos: su propio ORM, registro de módulos por base,
  entorno, cursores de base de datos, autenticación, manejo de peticiones y ciclo de transacciones.
- **Multiinquilino:** hay una base por restaurante y cada base carga su propio registro en memoria. Odoo ya gestiona eso
  (con expulsión LRU); dentro de Django habría que reimplementarlo, multiplicado por cada proceso de Django.
- **Transacciones:** `transaction.atomic()` de Django **no** controla las transacciones de Odoo. Odoo además reintenta
  solo las peticiones que chocan en la base; embebido, ese comportamiento se pierde.
- **Seguiría haciendo falta el servidor de Odoo** para las tareas programadas, el bus en tiempo real y las
  actualizaciones de módulos (`-u`). No desaparece ningún servicio: se agrega un acoplamiento frágil.
- **Dependencias:** Odoo 19 y Django fijan sus propias versiones de librerías; un solo entorno tendría que servir a los
  dos, y cada actualización de uno rompería al otro.
- **Rompe la regla nº 1 de la arquitectura:** «el bloque 3 nunca accede a la base de Odoo; solo a través del adaptador»
  ([`2026-09-04-arquitectura-modular.md`](2026-09-04-arquitectura-modular.md)).

**Django ya es el orquestador**, y no necesita compartir proceso con Odoo para serlo: orquestar es decidir el flujo y
recuperarse de fallos, no vivir en el mismo proceso. `experience` ya orquesta el flujo del comensal y los pagos (pago
aprobado → registrar en Odoo → evento para facturación). Reparto recomendado:

| Pieza | Responsabilidad |
|---|---|
| Odoo | Registros operativos y operaciones de negocio atómicas: POS, inventario, impuestos, contabilidad |
| `experience` | Sesiones del comensal, carrito, flujo de pago, coordinación, reintentos y conciliación |
| `registry` | Enrutar al inquilino y custodiar sus credenciales, detrás de su propio límite de seguridad |

Lo que Odoo escribe se hace dentro del ORM y los métodos de Odoo; Django **pide** la operación, no toca sus tablas.

### ¿Y pasar también el POS por Django?

No por ahora. Reenviar por Django las mismas 18–25 llamadas por pantalla **agrega un salto y lo hace más lento**, y
exigiría reescribir 104 llamadas y duplicar en Django la autenticación y los permisos de Odoo. Primero hay que cambiar la
**forma** de las llamadas (ver abajo). Reevaluar si aparece una necesidad concreta: exponer el POS a Internet con un
aislamiento más estricto, o trabajar sin conexión.

## Lo que sí vale la pena hacer (en orden)

1. **Cerrar el hueco del registro (seguridad, verificado).** `GET /internal/v1/resolve/<restaurante>/<sede>` pide una
   sola clave compartida y, **sin token de mesa**, devuelve la contraseña de Odoo **descifrada** del inquilino. Los
   nombres de restaurante y sede son públicos (van en las URLs del menú). Quien obtenga la clave de `experience` puede
   recorrer todos los restaurantes y llevarse todas las credenciales. La separación del registro —la razón por la que se
   descartó fusionarlo con `experience`— protege mucho menos de lo que su decisión documenta.

   **Corrección (mismo día, al implementarlo):** la opción «no devolver credenciales sin token de mesa» **no sirve**.
   Resolver sin mesa es un flujo legítimo que necesita credenciales: la entrada de domicilio (ya documentada como tal en
   las pruebas del registro), la página de pago de una reserva, favoritos y recompensas. Sobre ese punto, lo que hay:

   - **Hecho — rastro de auditoría** (`registry_app.models.CredentialRelease`): cada entrega de credenciales queda
     anotada (inquilino, si traía mesa, quién la pidió, cuándo), sin la credencial. Tras un incidente,
     `manage.py credential_releases --since <fecha>` da la lista exacta de inquilinos expuestos, para rotar solo esos en
     vez de todos. No aparece en el admin: la decisión del registro prohíbe exponer nada de credenciales ahí.
   - **Pendiente — el arreglo de fondo: un usuario de servicio con permisos mínimos por inquilino** (ya previsto en
     [`2026-09-05-registro-minimo-tokens-y-credenciales.md`](../decisiones/2026-09-05-registro-minimo-tokens-y-credenciales.md),
     punto 4; hoy la demo usa `admin`). No es un cambio rápido: `experience` hace **36 operaciones distintas** en Odoo,
     varias sensibles (escribe en `product.template` y `res.company`, abre sesiones de caja, registra pagos y marca
     pedidos pagados). Hay que definir un grupo que cubra exactamente esas, probar de punta a punta cada flujo del
     comensal con ese usuario y, en el mismo cambio, restringir `waiter_deposit_paid` a ese grupo (hallazgo nº 1 de la
     revisión con Codex). Conviene revisar antes si las escrituras en productos y compañía deben pasar por
     `experience` o ir del POS a Odoo directamente.
   - **Decisión del dueño (2026-09-21): no se hace por ahora.** Su razón: `experience` es nuestro Django y ahí manejamos
     la autenticación. Matiz que queda anotado para retomarlo antes de producción: esa autenticación protege de los
     comensales, pero el riesgo del usuario `admin` aparece solo si se compromete el propio `experience` (una
     dependencia vulnerable, un secreto filtrado); en ese caso tendría acceso de administrador a todos los restaurantes.
     El rastro de auditoría acota el daño a saber qué contraseñas rotar.
   - **Descartado — límite de peticiones en `resolve`:** con cientos de inquilinos, un límite que frene un recorrido
     también frenaría el tráfico legítimo; el rastro da la detección sin ese riesgo.

2. **Llamadas por pantalla, no por dato.** Métodos de Odoo que devuelvan en una sola llamada lo que una pantalla
   necesita (por ejemplo, Mesas: plano + pedidos + reservas del momento + meseros por zona). Es el arreglo real de la
   lentitud y deja la lógica donde están los datos. Migrar de a poco, empezando por lo que más se mide lento.
3. **Un solo comando para levantar todo en desarrollo**, con verificación de salud de cada servicio. Hoy son cinco
   procesos que se arrancan a mano tras cada reinicio de la máquina.
4. **Proxy inverso en producción** que exponga solo lo necesario de Odoo (ver punto 1 de arriba).

## Qué cambiaría esta recomendación

- Si Odoo dejara de ser la fuente de verdad de la operación (reemplazarlo por modelos propios en Django). Sería otro
  producto: habría que construir POS, inventario, impuestos, contabilidad y la facturación DIAN.
- Si hiciera falta operar sin conexión en el local. Entonces sí convendría una capa propia delante de Odoo que
  sincronice.
