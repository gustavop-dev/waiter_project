# projectapp_pantry

Addon **sin interfaz** para el módulo Inventario del kit CloudPos (Menu · Ingredients · Request List;
`pos/` → `lib/services/pantry.ts`). Todo se apoya en módulos estándar de Odoo 19 Community:

- Ingrediente = `product.template` almacenable (`type = consu`, `is_storable = True`), no vendible, con
  `is_ingredient`, `pantry_category` y proveedor en `product.supplierinfo` (`purchase`).
- Receta = `mrp.bom` tipo kit (`phantom`) del plato; sus líneas son los ingredientes con cantidad y unidad.
  Al vender el plato en el POS, Odoo (`pos_mrp` + `mrp`) descuenta los ingredientes del kit.
- Niveles Low / Medium / High / Empty desde `stock.warehouse.orderpoint` (mín / máx) o umbrales 5 / 20.
- Solicitud al proveedor = `purchase.order` en borrador (RFQ) marcada `waiter_pantry_request`.

Instalación: `-i projectapp_pantry` (depende de `mrp`, `purchase`, `stock`, `uom`, `point_of_sale`). El
`post_init_hook` siembra la demo (abajo).

## Campos nuevos en `product.template`

| Campo | Tipo | Regla |
|---|---|---|
| `is_ingredient` | Boolean | Marca de ingrediente. |
| `pantry_category` | Selection | `produce` Frutas y verduras · `meat` Carnes y aves · `seafood` Pescados y mariscos · `dairy` Lácteos y huevos · `dry` Secos y granos (las cinco del kit). |
| `pantry_min`, `pantry_max` | Float, calculados | Del orderpoint del producto o 5 / 20 por defecto. |
| `pantry_level` | Selection, calculado | `empty` (≤ 0) · `low` (< mín) · `medium` (< máx) · `high`. Ingrediente: con `qty_available`. Plato con receta: con `servings_available`. Plato sin receta: vacío (no se inventa). |
| `pantry_status` | Selection, calculado | `request` (empty / low) · `normal` (medium) · `good` (high). |
| `pantry_supplier_id` | Many2one `res.partner`, calculado | Primer `product.supplierinfo`. |
| `has_recipe` | Boolean, calculado | Hay `mrp.bom` kit con líneas. |
| `servings_available` | Integer, calculado | "Can be served": mínimo de `qty_available` del ingrediente / cantidad por ración (con conversión de unidades). 0 sin receta. |

`purchase.order.waiter_pantry_request` (Boolean): solicitud creada desde el POS.

Los calculados no se almacenan: `search_read` de `product.template` los devuelve al vuelo, así que la
lista de ingredientes es `search_read([('is_ingredient','=',True)], ['name','pantry_category','qty_available',
'uom_id','pantry_level','pantry_status','pantry_supplier_id','image_128'])`.

## API para el POS (`call_kw` sobre `product.template`)

| Llamada | Devuelve |
|---|---|
| `recipe_lines()` (sobre un id) | `[{id, product_tmpl_id, product_id, name, qty, uom_id, uom_name, qty_available, level, status, servings}]`. |
| `waiter_pantry_vals()` (sobre un id) | Ficha: `{id, product_id, name, is_ingredient, pantry_category, qty_available, uom_id, uom_name, pantry_min, pantry_max, pantry_level, pantry_status, supplier_id, supplier_name, has_recipe, servings_available, list_price, available_in_pos, image_url}`. |
| `waiter_request_ingredient(product_id, qty=None)` | `product_id` es el id de `product.template`. Crea la RFQ en borrador con el proveedor del ingrediente y devuelve la fila (`created: true`). Si ya hay borrador o RFQ enviada con ese ingrediente, devuelve esa (`created: false`). Sin proveedor: `UserError` "El ingrediente X no tiene proveedor…". `qty` por defecto = máximo − existencias (≥ mínimo del proveedor, ≥ 1). |
| `waiter_request_list()` | Solicitudes del POS, la más reciente primero: `{id, name, state, state_label, created, partner_id, partner_name, date_order, amount_total, currency_id, lines: [{id, product_id, product_tmpl_id, name, qty, uom_id, uom_name, price_unit}]}`. |
| `waiter_create_dish(vals, recipe=None)` | Crea el plato (`sale_ok`, `available_in_pos`, no almacenable) y su `mrp.bom` kit. `vals`: campos de `product.template`. `recipe`: `[{"product_tmpl_id": <ingrediente>` o `"product_id": <product.product>, "qty": 0.2, "uom_id": opcional}]`. Devuelve la ficha. |
| `waiter_set_recipe(recipe)` (sobre un id) | Reemplaza la receta (archiva la anterior). |
| `waiter_create_ingredient(vals, initial_qty=0.0, supplier_id=None)` | Crea el ingrediente (almacenable, no vendible, comprable). `vals` admite `pantry_min` / `pantry_max` (crean el orderpoint, disparo manual). `initial_qty` entra por ajuste de inventario (`stock.quant`) en el almacén principal. `supplier_id` crea el `product.supplierinfo` con `standard_price` como precio. Devuelve la ficha. |
| `waiter_set_thresholds(min_qty=None, max_qty=None)` / `waiter_set_stock(qty)` (sobre un id) | Orderpoint y ajuste de inventario del ingrediente. |

Unidades del kit → `uom.uom`: Kilogram `uom.product_uom_kgm`, Gram `uom.product_uom_gram`, Pieces
`uom.product_uom_unit`, Liter `uom.product_uom_litre`. Bunch, Clove y Slice no existen en Odoo: crearlas
en la categoría "Unit" si el POS las necesita.

## Demo (`post_init_hook`, idempotente; repetible con `hooks.seed_demo(env)`)

Dos proveedores (Distribuidora La Finca: frutas y verduras, lácteos, secos; Carnes y Mares del Valle:
carnes, mariscos). Ocho ingredientes con unidad, costo, mín / máx y stock inicial que cubre los cuatro
niveles: Carne de res Angus 12 kg, Pan brioche 60 u, Queso cheddar 3 kg (bajo), Huevos 0 (vacío),
Salmón fresco 25 kg (alto), Papa criolla 8 kg, Limón 40 u, Arroz 30 kg. Recetas para los platos demo que
existan: Hamburguesa Angus, Hamburguesa Clásica, Arepa con huevo y queso, Bowl de salmón, Papas
Trufadas, Limonada de Coco. En un Odoo ya instalado, `-i projectapp_pantry` siembra; `-u` no repite la
siembra (llamar `seed_demo` desde `odoo shell` si hace falta).

## Pruebas

`tests/test_pantry.py` (runner de Odoo): raciones servibles con conversión de unidades, niveles desde
orderpoint y por defecto, solicitud sin proveedor y sin duplicar, alta de plato con receta y de
ingrediente con stock inicial, siembra idempotente.

```
odoo -d projectapp -u projectapp_pantry --test-enable --test-tags /projectapp_pantry --stop-after-init
```


## Inventario operativo del restaurante

La ficha de recetas ahora permite editar ingredientes y rendimiento por lote, consultar costo por plato y el ingrediente limitante. `servings_available` descuenta los compromisos de pedidos pendientes antes de calcular las raciones. Las salidas reales de `pos_mrp` se ejecutan desde `action_pos_order_paid` del POS propio; repetir el cobro no repite el albarán.

API adicional: `waiter_recipe_detail`, `waiter_update_recipe`, `waiter_inventory_detail`, `waiter_inventory_move` y `waiter_inventory_settings`. Las mutaciones nuevas validan el PIN del administrador. Entradas, mermas y diferencias de conteo usan `stock.move`, con referencia, empleado y clave única de reintento. Los conteos se bloquean si hay compromisos pendientes o la existencia consultada cambió.

El alcance, comparación con Vástago y límites operativos se documentan en `docs/decisiones/2026-09-08-inventario-restaurante.md` del repositorio.
