import { INGREDIENT_CATEGORIES, INGREDIENT_ROOT, KIT_UNITS, type Dish, type Ingredient, type RecipeLine } from '@/lib/domain/pantry'
import { setStock, stockLocationId } from '@/lib/services/inventory'
import { callKw } from '@/lib/services/odoo'

// Inventario del kit sobre los módulos estándar de Odoo: ingredientes = product.template almacenable y no vendible,
// receta = mrp.bom tipo kit (phantom), proveedor = product.supplierinfo, umbrales = stock.warehouse.orderpoint,
// solicitud = purchase.order en borrador. No hay addon propio: todo se lee y escribe por JSON-RPC.

export interface Unit { id: number; name: string; factor: number }
export interface IngredientCategory { id: number; name: string }
export interface Supplier { id: number; name: string; hasImage: boolean }
export interface RequestLine { product: string; qty: number; uomName: string }
export interface PurchaseRequest { id: number; name: string; state: string; supplierName: string; date: string; lines: RequestLine[] }
export interface DishInput { name: string; categoryIds: number[]; description: string; price: number; lines: { productId: number; qty: number; uomId: number }[] }
export interface IngredientInput { name: string; categoryId: number; uomId: number; stock: number; image?: string; supplierId: number }

type Ref = [number, string] | false
interface RawDish { id: number; name: string; list_price: number; pos_categ_ids: number[]; available_in_pos: boolean; image_128: string | false }
interface RawBom { id: number; product_tmpl_id: [number, string]; product_qty: number }
interface RawBomLine { id: number; bom_id: [number, string]; product_id: [number, string]; product_tmpl_id: [number, string]; product_qty: number; product_uom_id: [number, string] }
interface RawIngredient { id: number; name: string; categ_id: Ref; qty_available: number; uom_id: [number, string]; image_128: string | false; product_variant_id: [number, string] }
interface RawSeller { product_tmpl_id: [number, string]; partner_id: [number, string]; price: number }
interface RawOrderpoint { product_id: [number, string]; product_min_qty: number; product_max_qty: number }
interface RawOrder { id: number; name: string; state: string; partner_id: [number, string]; date_order: string }
interface RawOrderLine { order_id: [number, string]; product_id: Ref; product_qty: number; product_uom_id: Ref }

export const DISH_DOMAIN = [['type', '=', 'consu'], ['sale_ok', '=', true], '|', ['available_in_pos', '=', true], ['pos_categ_ids', '!=', false]]
export const INGREDIENT_DOMAIN = [['type', '=', 'consu'], ['sale_ok', '=', false], ['is_storable', '=', true], ['available_in_pos', '=', false]]
export const REQUEST_ORIGIN = 'Waiter · Inventario'
const OPEN_STATES = ['draft', 'sent', 'to approve', 'purchase']

export async function listUnits(): Promise<Unit[]> {
  return callKw<Unit[]>('uom.uom', 'search_read', [[], ['name', 'factor']], { order: 'name asc' })
}

// Crea las unidades del kit que Odoo no trae (Manojo, Diente, Rebanada) como unidades de referencia propias.
export async function ensureUnits(): Promise<Unit[]> {
  const units = await listUnits()
  const missing = KIT_UNITS.filter((u) => !units.some((x) => x.name === u.uom))
  for (const u of missing) units.push({ id: await callKw<number>('uom.uom', 'create', [{ name: u.uom, relative_factor: 1 }]), name: u.uom, factor: 1 })
  return units
}

export async function listIngredientCategories(): Promise<IngredientCategory[]> {
  return callKw<IngredientCategory[]>('product.category', 'search_read', [[['parent_id.name', '=', INGREDIENT_ROOT]], ['name']], { order: 'id asc' })
}

// Idempotente: crea "Ingredientes" y sus cinco hijas del kit solo si faltan.
export async function ensureIngredientCategories(): Promise<IngredientCategory[]> {
  const roots = await callKw<{ id: number }[]>('product.category', 'search_read', [[['name', '=', INGREDIENT_ROOT], ['parent_id', '=', false]], ['id']], { limit: 1 })
  const rootId = roots[0]?.id ?? await callKw<number>('product.category', 'create', [{ name: INGREDIENT_ROOT }])
  const existing = await listIngredientCategories()
  for (const c of INGREDIENT_CATEGORIES) {
    if (!existing.some((x) => x.name === c.name)) existing.push({ id: await callKw<number>('product.category', 'create', [{ name: c.name, parent_id: rootId }]), name: c.name })
  }
  return existing
}

export async function listSuppliers(): Promise<Supplier[]> {
  const rows = await callKw<{ id: number; name: string; image_128: string | false }[]>('res.partner', 'search_read', [[['supplier_rank', '>', 0]], ['name', 'image_128']], { order: 'name asc' })
  return rows.map((r) => ({ id: r.id, name: r.name, hasImage: Boolean(r.image_128) }))
}

// Platos del POS con su receta (líneas del kit por ración: cantidad de la línea / cantidad del kit).
export async function listDishes(units?: Unit[]): Promise<Dish[]> {
  const factor = new Map((units ?? await listUnits()).map((u) => [u.id, u.factor]))
  const rows = await callKw<RawDish[]>('product.template', 'search_read', [DISH_DOMAIN, ['name', 'list_price', 'pos_categ_ids', 'available_in_pos', 'image_128']], { order: 'name asc' })
  const boms = await callKw<RawBom[]>('mrp.bom', 'search_read', [[['type', '=', 'phantom'], ['product_tmpl_id', 'in', rows.map((r) => r.id)]], ['product_tmpl_id', 'product_qty']], { order: 'sequence asc, id asc' })
  const lines = boms.length === 0 ? [] : await callKw<RawBomLine[]>('mrp.bom.line', 'search_read', [[['bom_id', 'in', boms.map((b) => b.id)]], ['bom_id', 'product_id', 'product_tmpl_id', 'product_qty', 'product_uom_id']], { order: 'sequence asc, id asc' })
  const recipeOf = new Map<number, RecipeLine[]>()
  for (const b of boms) {
    if (recipeOf.has(b.product_tmpl_id[0])) continue
    const per = b.product_qty || 1
    recipeOf.set(b.product_tmpl_id[0], lines.filter((l) => l.bom_id[0] === b.id).map((l) => ({
      lineId: l.id, ingredientId: l.product_tmpl_id[0], productId: l.product_id[0], name: l.product_id[1], qty: l.product_qty / per,
      uomId: l.product_uom_id[0], uomName: l.product_uom_id[1], uomFactor: factor.get(l.product_uom_id[0]) ?? 1,
    })))
  }
  return rows.map((r) => ({ id: r.id, name: r.name, categoryIds: r.pos_categ_ids, availableInPos: r.available_in_pos, hasImage: Boolean(r.image_128), price: r.list_price, recipe: recipeOf.get(r.id) ?? null }))
}

export async function listIngredients(units?: Unit[]): Promise<Ingredient[]> {
  const factor = new Map((units ?? await listUnits()).map((u) => [u.id, u.factor]))
  const rows = await callKw<RawIngredient[]>('product.template', 'search_read', [INGREDIENT_DOMAIN, ['name', 'categ_id', 'qty_available', 'uom_id', 'image_128', 'product_variant_id']], { order: 'name asc' })
  if (rows.length === 0) return []
  const sellers = await callKw<RawSeller[]>('product.supplierinfo', 'search_read', [[['product_tmpl_id', 'in', rows.map((r) => r.id)]], ['product_tmpl_id', 'partner_id', 'price']], { order: 'sequence asc, id asc' })
  const points = await callKw<RawOrderpoint[]>('stock.warehouse.orderpoint', 'search_read', [[['product_id', 'in', rows.map((r) => r.product_variant_id[0])]], ['product_id', 'product_min_qty', 'product_max_qty']], { order: 'id asc' })
  return rows.map((r) => {
    const seller = sellers.find((s) => s.product_tmpl_id[0] === r.id)
    const point = points.find((p) => p.product_id[0] === r.product_variant_id[0])
    return {
      id: r.id, productId: r.product_variant_id[0], name: r.name, categoryId: r.categ_id ? r.categ_id[0] : null, categoryName: r.categ_id ? r.categ_id[1].split(' / ').pop() ?? '' : '',
      qty: r.qty_available, uomId: r.uom_id[0], uomName: r.uom_id[1], uomFactor: factor.get(r.uom_id[0]) ?? 1, hasImage: Boolean(r.image_128),
      supplierId: seller ? seller.partner_id[0] : null, supplierName: seller ? seller.partner_id[1] : null, supplierPrice: seller?.price ?? 0,
      thresholds: point ? { min: point.product_min_qty, max: point.product_max_qty } : null,
    }
  })
}

// Alta del plato: producto del POS y, si trae ingredientes, su receta como kit (mrp.bom phantom).
export async function createDish(d: DishInput): Promise<number> {
  const id = await callKw<number>('product.template', 'create', [{ name: d.name, list_price: d.price, pos_categ_ids: [[6, 0, d.categoryIds]], description_sale: d.description || false, available_in_pos: true, sale_ok: true, type: 'consu' }])
  if (d.lines.length > 0) {
    const [tmpl] = await callKw<{ uom_id: [number, string] }[]>('product.template', 'read', [[id], ['uom_id']])
    await callKw('mrp.bom', 'create', [{ product_tmpl_id: id, type: 'phantom', product_qty: 1, product_uom_id: tmpl.uom_id[0], bom_line_ids: d.lines.map((l) => [0, 0, { product_id: l.productId, product_qty: l.qty, product_uom_id: l.uomId }]) }])
  }
  return id
}

const ingredientValues = (i: IngredientInput) => ({ name: i.name, categ_id: i.categoryId, uom_id: i.uomId, ...(i.image !== undefined ? { image_1920: i.image } : {}) })

// Alta del ingrediente: producto almacenable no vendible con su proveedor; el stock inicial es un ajuste de inventario.
export async function createIngredient(i: IngredientInput): Promise<number> {
  const id = await callKw<number>('product.template', 'create', [{ ...ingredientValues(i), type: 'consu', is_storable: true, sale_ok: false, purchase_ok: true, available_in_pos: false, seller_ids: [[0, 0, { partner_id: i.supplierId, min_qty: 0, price: 0 }]] }])
  if (i.stock > 0) {
    const [tmpl] = await callKw<{ product_variant_id: [number, string] }[]>('product.template', 'read', [[id], ['product_variant_id']])
    await setStock(tmpl.product_variant_id[0], await stockLocationId(), i.stock)
  }
  return id
}

// Odoo no deja cambiar la unidad de un producto con movimientos: solo se escribe si cambió.
export async function updateIngredient(current: Ingredient, i: IngredientInput): Promise<void> {
  const { uom_id, ...rest } = ingredientValues(i)
  await callKw('product.template', 'write', [[current.id], uom_id === current.uomId ? rest : { ...rest, uom_id }])
  if (i.supplierId !== current.supplierId) {
    const found = await callKw<{ id: number }[]>('product.supplierinfo', 'search_read', [[['product_tmpl_id', '=', current.id]], ['id']], { limit: 1 })
    if (found[0]) await callKw('product.supplierinfo', 'write', [[found[0].id], { partner_id: i.supplierId }])
    else await callKw('product.supplierinfo', 'create', [{ product_tmpl_id: current.id, partner_id: i.supplierId, min_qty: 0, price: 0 }])
  }
  if (i.stock !== current.qty) await setStock(current.productId, await stockLocationId(), i.stock)
}

// "Eliminar" del kit = archivar en Odoo: el historial de movimientos y recetas se conserva.
export async function archiveIngredient(id: number): Promise<void> {
  await callKw('product.template', 'write', [[id], { active: false }])
}

// Solicitud al proveedor: purchase.order en borrador (RFQ) con una línea. Odoo no envía correo hasta que alguien
// pulse "Enviar por correo" en la orden; el POS solo la deja lista en la lista de solicitudes.
export async function requestIngredient(i: Ingredient, qty: number): Promise<number> {
  if (i.supplierId === null) throw new Error('no-supplier')
  return callKw<number>('purchase.order', 'create', [{ partner_id: i.supplierId, origin: REQUEST_ORIGIN, order_line: [[0, 0, { product_id: i.productId, name: i.name, product_qty: qty, product_uom_id: i.uomId, price_unit: i.supplierPrice }]] }])
}

export async function listRequests(): Promise<PurchaseRequest[]> {
  const orders = await callKw<RawOrder[]>('purchase.order', 'search_read', [[['state', 'in', OPEN_STATES]], ['name', 'state', 'partner_id', 'date_order']], { order: 'date_order desc, id desc' })
  if (orders.length === 0) return []
  const lines = await callKw<RawOrderLine[]>('purchase.order.line', 'search_read', [[['order_id', 'in', orders.map((o) => o.id)]], ['order_id', 'product_id', 'product_qty', 'product_uom_id']], { order: 'id asc' })
  return orders.map((o) => ({
    id: o.id, name: o.name, state: o.state, supplierName: o.partner_id[1], date: o.date_order,
    lines: lines.filter((l) => l.order_id[0] === o.id).map((l) => ({ product: l.product_id ? l.product_id[1] : '', qty: l.product_qty, uomName: l.product_uom_id ? l.product_uom_id[1] : '' })),
  }))
}
