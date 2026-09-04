# Decisión: una base de datos por restaurante

- **Fecha:** 2026-09-04
- **Estado:** aceptada
- **Contexto previo:** [spike de Odoo Community](2026-09-04-spike-odoo-community.md)

## Decisión

Cada restaurante (tenant) tiene **su propia base de datos de Odoo**. Se descarta
el modelo de una base compartida con multiempresa de Odoo.

## Por qué

### El aislamiento multiempresa de Odoo no cubre las mesas

`point_of_sale` declara reglas de registro multiempresa para `pos.order`,
`pos.order.line`, `pos.session`, `pos.config`, `pos.payment` y
`pos.payment.method`. Pero `pos_restaurant` **solo trae un
`ir.model.access.csv`, sin ninguna `ir.rule`**, y sus modelos no tienen campo
`company_id`:

```python
class RestaurantTable(models.Model):
    _name = 'restaurant.table'
    floor_id, table_number, shape, position_h, position_v,
    width, height, seats, color, parent_id, active
    # no hay company_id
```

**Comprobado empíricamente**, no deducido del código. Se crearon dos compañías
en una misma base y un usuario perteneciente solo a la primera:

```text
MARK_VE_MESA_AJENA     True
MARK_FLOORS_VISIBLES   ['Main Floor', ..., 'Piso Secreto R2']
```

El usuario del Restaurante 1 ve el piso y las mesas del Restaurante 2.

Es el mismo patrón que el otro hallazgo del spike: el endpoint público de
self-order devuelve los `identifier` de las 25 mesas del local. **Odoo modela las
mesas como mobiliario de una empresa única, no como datos de un inquilino.**

### El costo de la alternativa es bajo

Medido en la instancia real:

| Métrica | Valor |
|---|---|
| Base limpia (sin datos demo, 69 módulos) | **54 MB** |
| Base con datos demo | 75 MB |
| RAM del contenedor Odoo | 472 MB |

A 54 MB por inquilino, **500 restaurantes son ~30 GB de Postgres**. Con el precio
objetivo ($399.000–$599.000 COP/mes/sede) el número de inquilinos se cuenta en
cientos, no en decenas de miles.

## Consecuencias

**A favor:**

- Aislamiento **físico**. No depende de que nadie escriba bien una `ir.rule`.
- Backup, restauración y migración independientes por cliente.
- Un cliente que se va se lleva su base; no hay que extraer sus filas de nada.
- No hay que auditar los 685 módulos buscando modelos sin `company_id`, ni
  repetir esa auditoría en cada actualización de Odoo.

**En contra (asumido conscientemente):**

- Las migraciones corren N veces. Hace falta orquestación de despliegues.
- Se necesita un script de aprovisionamiento de inquilinos.
- El arranque en frío de una base sin uso reciente tiene latencia (Odoo mantiene
  los registros en memoria con expulsión LRU).

## Base de referencia del inquilino

La base limpia que sirve de plantilla se crea así:

```bash
odoo -d <tenant> --db_host db -r odoo -w odoo \
  -i point_of_sale,pos_restaurant,pos_self_order,\
pos_online_payment,pos_online_payment_self_order,l10n_co,l10n_co_pos \
  --without-demo=all --load-language=es_CO --stop-after-init
```

Y después, por código: país Colombia, plan contable `co`, moneda COP, idioma
`es_CO` en la compañía y en el usuario administrador.

Resultado verificado: **69 módulos, 6 apps, 384 cuentas contables, cero datos de
demostración.**

## Pendiente

- Script de aprovisionamiento automatizado (crear base, configurar compañía,
  sembrar mesas y carta).
- Estrategia de migraciones sobre N bases.
- Medir cuántas bases activas aguanta un worker de Odoo antes de que la
  expulsión LRU empiece a doler.
