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
  ┌───────────────────┐   pago ok →  ┌────────────────────┐
  │ BLOQUE 1 — POS    │─────────────▶│ BLOQUE 2 —         │
  │ Odoo Community    │              │ Facturación DIAN   │
  │ 1 base/restaurante│              │                    │
  └───────────────────┘              └────────────────────┘
```

### Bloque 1 — Operación (POS)

**Qué hace:** mesas, pisos, sesiones de caja, productos, modificadores, combos,
inventario, pedidos, cocina.

**Qué es:** Odoo Community, una base de datos por restaurante.

**Qué NO hace:** no sabe que existen URLs públicas, ni NFC, ni Mesero IA, ni el
registro central. Es un sistema operativo interno del restaurante.

**Contrato:** su API externa JSON-RPC (`/web/dataset/call_kw`), consumida con un
usuario de servicio por inquilino. **No hace falta escribir ningún addon de Odoo
para la primera versión.**

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

## Reglas de dependencia

1. El bloque 3 nunca accede a la base de Odoo; solo a través del adaptador.
2. El bloque 2 se dispara por eventos y desconoce menús, mesas y comensales.
3. El bloque 1 desconoce por completo los bloques 2 y 3.
4. El registro central no contiene lógica de negocio de ninguno de los tres.

Cualquier import, consulta SQL o dependencia que viole estas reglas es un error
de arquitectura, no un atajo.

## URLs públicas

Dos entradas, ambas resueltas por el registro central:

```text
Domicilio (general)   restaurant.projectapp.co/r/burger-house-poblado
Mesa (NFC / QR)       restaurant.projectapp.co/t/K7M2QX8A
```

### El token público lo emite el registro, no Odoo

`restaurant.table.identifier` de Odoo es `uuid4().hex[:8]` — 32 bits — y
**no tiene ninguna restricción de unicidad en la base**: solo existen la clave
primaria y cinco claves foráneas. Con una base por restaurante, los
identificadores se generan aislados y nadie los coordina. Por la paradoja del
cumpleaños:

| Escala | Mesas totales | Probabilidad de colisión |
|---|---|---|
| 500 restaurantes × 30 mesas | 15.000 | 2,6 % |
| 2.000 restaurantes × 30 mesas | 60.000 | 34 % |

Una colisión haría que un `/t/<token>` apunte a dos mesas de restaurantes
distintos, y **las placas NFC son físicas**: no se reimprimen cuando aparece el
conflicto.

Por eso el token público lo emite el registro central, con unicidad global
garantizada por una constraint real. El `identifier` de Odoo queda como detalle
interno.

Esto cierra además el hueco de seguridad detectado en el spike: como el token es
nuestro, se puede revocar, rotar y limitar en tasa sin depender de Odoo.

## Flujo principal

```text
1. Comensal toca el NFC          -> /t/K7M2QX8A
2. Bloque 3 pregunta al registro -> (restaurante, sede, mesa, credenciales)
3. Bloque 3 pide la carta        -> adaptador -> Odoo del inquilino
4. Comensal pide (menú o IA)     -> carrito en el bloque 3
5. Confirma                      -> adaptador -> pedido en Odoo -> cocina
6. Paga                          -> pasarela -> evento "pago aprobado"
7. Facturación                   -> bloque 2 -> DIAN -> CUFE
8. Métricas                      -> registro central -> dashboard de ROI
```

## Estructura del repositorio

```text
waiter_project/
├── docs/
│   ├── producto/          visión
│   ├── decisiones/        ADRs
│   └── arquitectura/      este documento
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

## Decisiones pendientes

- **Origen de la carta:** CSV entregado por el restaurante, importación desde su
  POS actual, o captura manual en el onboarding.
- **Pasarela de pago:** Odoo Community no trae Wompi, Bold ni Nequi. Hay que
  elegir e integrar.
- **Proveedor del Mesero IA** y su presupuesto por conversación.
- **Motor fiscal:** confirmar FacturaLatam Enterprise como bloque 2.
