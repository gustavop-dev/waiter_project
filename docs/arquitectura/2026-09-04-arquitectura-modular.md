# Arquitectura modular: tres bloques y un registro

- **Fecha:** 2026-09-04
- **Estado:** aceptada
- **Depende de:** [una base por restaurante](../decisiones/2026-09-04-multi-tenant.md),
  [spike de Odoo Community](../decisiones/2026-09-04-spike-odoo-community.md)

## Principio

El sistema se divide en **bloques que se despliegan, prueban y entienden por
separado**. La separación no la dan las carpetas: la dan las dependencias. Un
bloque solo conoce a otro a través de un contrato explícito.

## Los bloques

```text
                      Comensal (móvil)
                            │
                     NFC / QR / enlace
                            │
              ┌─────────────▼──────────────┐
              │  BLOQUE 3 — Experiencia    │  Django
              │  menú, carrito, Mesero IA  │
              │  pago, estado del pedido   │
              └─────────────┬──────────────┘
                            │ ¿qué inquilino es?
              ┌─────────────▼──────────────┐
              │  REGISTRO CENTRAL          │  Django
              │  token → restaurante/sede/ │
              │          mesa              │
              │  suscripciones, métricas   │
              └─────────────┬──────────────┘
                            │
          ┌─────────────────┴──────────────────┐
          ▼                                    ▼
  ┌───────────────────┐              ┌────────────────────┐
  │ BLOQUE 1 — POS    │              │ BLOQUE 2 —         │
  │ Odoo Community    │              │ Facturación DIAN   │
  │ 1 base/restaurante│              │                    │
  └───────────────────┘              └────────────────────┘
          ▲                                    ▲
          └──────────── ambos los invoca ──────┘
                        el bloque 3
```

**Quién dispara a quién.** El bloque 3 es el único que orquesta: cuando la
pasarela confirma el pago, él registra el pago en Odoo (bloque 1) y emite el
evento `pago aprobado` que consume facturación (bloque 2). Los bloques 1 y 2
nunca se llaman entre sí; ninguno de los dos sabe que el otro existe.

### Bloque 1 — Operación (POS)

**Qué hace:** mesas, pisos, sesiones de caja, productos, modificadores, combos,
inventario, pedidos, cocina.

**Qué es:** Odoo Community, una base de datos por restaurante.

**Qué NO hace:** no sabe que existen URLs públicas, ni NFC, ni Mesero IA, ni el
registro central.

**Quién lo ve.** El comensal, nunca. El personal, sí: la **interfaz POS de Odoo**
(`/pos/ui`) es una aplicación a pantalla completa y táctil, sin nada del
backoffice, y sirve tal cual para meseros y cajeros. El backoffice lo usa el
administrador para productos, precios y mesas.

**La cocina (resuelto 2026-09-05):** KDS propio en `pos/` sobre
`restaurant.order.course` de Odoo, con el addon `projectapp_kitchen` para
*listo* / *entregado* / estación. Ver
[la decisión](../decisiones/2026-09-05-cocina-sobre-cursos-odoo.md).

**Contrato:** su API externa JSON-RPC (`/web/dataset/call_kw`), consumida con un
usuario de servicio por inquilino. Dos addons propios **sin interfaz**
(`projectapp_pos_design`, `projectapp_kitchen`): campos y métodos, nunca vistas.

### Bloque 2 — Facturación

**Qué hace:** emitir el documento fiscal ante la DIAN y devolver CUFE, XML y
representación gráfica.

**Qué NO hace:** no sabe qué es un menú, una mesa ni un Mesero IA. Recibe un
documento que emitir y responde con su resultado fiscal.

**Contrato:** se dispara por el evento `pago aprobado`. Entrada: identificación
del emisor, del adquiriente, líneas e impuestos. Salida: CUFE + XML + PDF, o un
error fiscal tipificado.

### Bloque 3 — Experiencia del comensal

**Qué hace:** servir la carta pública, el carrito, el Mesero IA, el pago y el
estado del pedido. Es el bloque diferenciador del producto.

**Qué NO hace:** **nunca toca la base de datos de Odoo directamente.** Habla con
el bloque 1 mediante un adaptador. Si mañana se cambia de POS, se reescribe el
adaptador, no la experiencia.

### Registro central

No es un bloque de negocio, es la consecuencia directa de tener una base por
restaurante: **algo tiene que saber a qué inquilino pertenece una URL pública**
antes de poder consultar ninguna base de Odoo.

**Qué guarda:** restaurantes, sedes, mesas, tokens públicos, credenciales de
servicio por inquilino, suscripciones del SaaS y métricas de ROI agregadas (que
por definición cruzan inquilinos y no caben en la base de ninguno).

Guarda credenciales de todos los inquilinos, así que es el activo más sensible
del sistema: cifrado en reposo y rotación de credenciales son requisitos, no
mejoras.

## Reglas de dependencia

1. El bloque 3 nunca accede a la base de Odoo; solo a través del adaptador.
2. El bloque 2 se dispara por eventos y desconoce menús, mesas y comensales.
3. El bloque 1 desconoce por completo los bloques 2 y 3.
4. El registro central no contiene lógica de negocio de ninguno de los tres.

Cualquier import, consulta SQL o dependencia que viole estas reglas es un error
de arquitectura, no un atajo.

## URLs públicas

Dos entradas, ambas resueltas por el registro central:

### Resolución jerárquica del token: restaurante → sede → mesa

El token de mesa **no se busca globalmente**. Se resuelve por jerarquía: primero
el restaurante, luego la sede, y dentro de ella la mesa. La URL lleva ese
contexto:

```text
Domicilio (general)   restaurant.projectapp.co/burger-house/poblado
Mesa (NFC / QR)       restaurant.projectapp.co/burger-house/poblado/t/8H2KQ7
```

Esto importa porque `restaurant.table.identifier` de Odoo es `uuid4().hex[:8]`
—32 bits— y **no tiene ninguna restricción de unicidad en la base**: solo
existen la clave primaria y cinco claves foráneas. Con una base por restaurante,
los identificadores se generan aislados y nadie los coordina entre inquilinos.

El alcance de la búsqueda es lo que determina el riesgo:

| Alcance | Mesas en el dominio | Probabilidad de colisión |
|---|---|---|
| Global | 60.000 | 34 % |
| Por restaurante (cadena de 10 sedes) | 500 | 0,003 % |
| Por restaurante + sede | 50 | 0,00003 % |

**Acotar por restaurante es lo que resuelve el problema** (cinco órdenes de
magnitud). Acotar además por sede añade otros dos, pero es refinamiento sobre
algo ya resuelto.

### Y una constraint, para que deje de ser probabilístico

El alcance jerárquico reduce el riesgo; no lo elimina. Mientras no exista una
restricción de unicidad, la colisión es improbable pero posible, y **las placas
NFC son físicas: no se reimprimen cuando aparece el conflicto**.

Por eso el registro central mantiene su propia tabla de tokens con una
constraint `UNIQUE (sede, token)`. La emisión del token pasa por ahí, de modo que
la colisión deja de ser un cálculo de probabilidad y pasa a ser imposible.

Como el token es nuestro y no de Odoo, además se puede revocar, rotar y limitar
en tasa — lo que cierra el hueco de seguridad detectado en el spike.

## Flujo principal

```text
1. Comensal toca el NFC          -> /burger-house/poblado/t/8H2KQ7
2. Bloque 3 resuelve en el registro -> restaurante -> sede -> mesa + credenciales
3. Bloque 3 pide la carta        -> adaptador -> Odoo del inquilino
4. Comensal pide (menú o IA)     -> carrito en el bloque 3
5. Confirma                      -> adaptador -> pedido en Odoo -> cocina
6. Paga                          -> pasarela -> confirma al bloque 3
7. Bloque 3 registra el pago     -> adaptador -> Odoo
8. Bloque 3 emite "pago aprobado"-> bloque 2 -> DIAN -> CUFE
9. Métricas                      -> registro central -> dashboard de ROI
```

## Estructura del repositorio

```text
waiter_project/
├── docs/
│   ├── producto/          visión
│   ├── decisiones/        ADRs
│   └── arquitectura/      este documento
├── pos/                   app Next.js del operador: mesero y cajero (bloque 1, lado cliente)
├── registry/              servicio Django: registro central
├── experience/            servicio Django: bloque 3 (backend)
├── billing/               servicio Django: bloque 2
├── odoo/
│   ├── compose/           despliegue de Odoo
│   └── provisioning/      script de aprovisionamiento de inquilinos
└── scripts/
```

Cada servicio Django tiene su propia base de datos, sus dependencias y su
despliegue. El repositorio es único (monorepo) para que los contratos entre
bloques se versionen juntos.

## Estado (2026-09-05)

| Pieza | Estado |
|---|---|
| Bloque 1 · Odoo headless + `pos/` (salón, pedido, cobro, KDS) | operativo |
| Registro central · resolución interna, tokens, credenciales | mínimo operativo (`registry/`) |
| Bloque 3 · carta, sesiones, carrito, confirmación, estado | backend operativo (`experience/`); sin pagos ni PWA |
| Bloque 2 · facturación DIAN | no iniciado |

## Decisiones pendientes

- **Origen de la carta:** CSV entregado por el restaurante, importación desde su
  POS actual, o captura manual en el onboarding.
- **Pasarela de pago:** Odoo Community no trae Wompi, Bold ni Nequi. Hay que
  elegir e integrar.
- **Proveedor del Mesero IA** y su presupuesto por conversación.
- **Motor fiscal:** confirmar FacturaLatam Enterprise como bloque 2.
