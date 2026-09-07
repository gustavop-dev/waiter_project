// Siembra idempotente del inventario del kit (12 – Inventory) en la base demo de Odoo, por JSON-RPC.
// Uso: node scripts/seed-pantry.cjs            (ODOO_URL, ODOO_DB, ODOO_USER, ODOO_PASSWORD opcionales)
// Crea o actualiza: categorías "Ingredientes / …", unidades del kit, 2 proveedores, 8 ingredientes con stock y
// punto de pedido, y la receta (mrp.bom tipo kit) de 6 platos demo. Volver a correrlo deja el stock en los valores demo.
const URL = (process.env.ODOO_URL || 'http://192.168.56.10:8069').replace(/\/$/, '')
const DB = process.env.ODOO_DB || 'projectapp'
const USER = process.env.ODOO_USER || 'admin'
const PASSWORD = process.env.ODOO_PASSWORD || 'admin'

const ROOT = 'Ingredientes'
const CATEGORIES = ['Frutas y verduras', 'Carnes y aves', 'Pescados y mariscos', 'Lácteos y huevos', 'Secos y granos']
const UNITS = ['Manojo', 'Diente', 'Rebanada']
const SUPPLIERS = [
  { name: 'Distribuidora La Cosecha', email: 'pedidos@lacosecha.demo', phone: '+57 601 555 0101' },
  { name: 'Carnes y Mar del Valle', email: 'ventas@carnesymar.demo', phone: '+57 602 555 0202' },
]
// stock en la unidad del ingrediente; min/max = stock.warehouse.orderpoint; price = tarifa del proveedor.
const INGREDIENTS = [
  { name: 'Lechuga romana', category: 'Frutas y verduras', uom: 'kg', stock: 1.5, min: 2, max: 10, supplier: 'Distribuidora La Cosecha', price: 6000 },
  { name: 'Tomate chonto', category: 'Frutas y verduras', uom: 'kg', stock: 4.2, min: 2, max: 10, supplier: 'Distribuidora La Cosecha', price: 4500 },
  { name: 'Carne de res molida', category: 'Carnes y aves', uom: 'kg', stock: 10, min: 3, max: 8, supplier: 'Carnes y Mar del Valle', price: 28000 },
  { name: 'Salmón fresco', category: 'Pescados y mariscos', uom: 'kg', stock: 0.9, min: 2, max: 6, supplier: 'Carnes y Mar del Valle', price: 65000 },
  { name: 'Huevos AA', category: 'Lácteos y huevos', uom: 'Units', stock: 84, min: 30, max: 80, supplier: 'Distribuidora La Cosecha', price: 700 },
  { name: 'Queso cheddar', category: 'Lácteos y huevos', uom: 'kg', stock: 0.9, min: 1, max: 5, supplier: 'Distribuidora La Cosecha', price: 32000 },
  { name: 'Pan de hamburguesa', category: 'Secos y granos', uom: 'Units', stock: 40, min: 20, max: 80, supplier: 'Distribuidora La Cosecha', price: 1500 },
  { name: 'Arroz blanco', category: 'Secos y granos', uom: 'kg', stock: 7, min: 5, max: 20, supplier: 'Distribuidora La Cosecha', price: 4200 },
]
// Receta por ración de los platos demo existentes (se buscan por nombre; si el plato no existe, se omite).
const RECIPES = {
  'Hamburguesa Clásica': [['Pan de hamburguesa', 1, 'Units'], ['Carne de res molida', 150, 'g'], ['Queso cheddar', 30, 'g'], ['Lechuga romana', 20, 'g'], ['Tomate chonto', 30, 'g']],
  'Hamburguesa Angus': [['Pan de hamburguesa', 1, 'Units'], ['Carne de res molida', 300, 'g'], ['Queso cheddar', 50, 'g']],
  'Arepa con huevo y queso': [['Huevos AA', 1, 'Units'], ['Queso cheddar', 50, 'g']],
  'Bowl de salmón': [['Salmón fresco', 180, 'g'], ['Arroz blanco', 150, 'g']],
  'Pasta carbonara': [['Huevos AA', 2, 'Units'], ['Queso cheddar', 40, 'g']],
  'Tacos de carne': [['Carne de res molida', 120, 'g'], ['Tomate chonto', 30, 'g'], ['Lechuga romana', 20, 'g']],
}

let uid = null
let rpcId = 1
async function rpc(service, method, args) {
  const res = await fetch(`${URL}/jsonrpc`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', method: 'call', id: rpcId++, params: { service, method, args } }) })
  const data = await res.json()
  if (data.error) throw new Error(data.error.data?.message || data.error.message)
  return data.result
}
const call = (model, method, args, kwargs = {}) => rpc('object', 'execute_kw', [DB, uid, PASSWORD, model, method, args, kwargs])
const searchRead = (model, domain, fields, kwargs = {}) => call(model, 'search_read', [domain, fields], kwargs)

async function ensure(model, domain, values, fields = ['id']) {
  const [found] = await searchRead(model, domain, fields, { limit: 1, context: { active_test: false } })
  if (found) return found.id
  return call(model, 'create', [values])
}

async function setStock(productId, locationId, qty) {
  const [quant] = await searchRead('stock.quant', [['product_id', '=', productId], ['location_id', '=', locationId]], ['id', 'quantity'], { limit: 1 })
  if (quant && Math.abs(quant.quantity - qty) < 1e-6) return
  let quantId = quant && quant.id
  if (quantId) await call('stock.quant', 'write', [[quantId], { inventory_quantity: qty }])
  else quantId = await call('stock.quant', 'create', [{ product_id: productId, location_id: locationId, inventory_quantity: qty }])
  await call('stock.quant', 'action_apply_inventory', [[quantId]])
}

async function main() {
  uid = await rpc('common', 'login', [DB, USER, PASSWORD])
  if (!uid) throw new Error(`No se pudo entrar a Odoo en ${URL} (${DB}, ${USER})`)
  const rootId = await ensure('product.category', [['name', '=', ROOT], ['parent_id', '=', false]], { name: ROOT })
  const categoryId = {}
  for (const name of CATEGORIES) categoryId[name] = await ensure('product.category', [['name', '=', name], ['parent_id', '=', rootId]], { name, parent_id: rootId })
  for (const name of UNITS) await ensure('uom.uom', [['name', '=', name]], { name, relative_factor: 1 })
  const uomId = Object.fromEntries((await searchRead('uom.uom', [], ['name'])).map((u) => [u.name, u.id]))
  const supplierId = {}
  for (const s of SUPPLIERS) {
    supplierId[s.name] = await ensure('res.partner', [['name', '=', s.name]], { name: s.name, is_company: true, supplier_rank: 1, email: s.email, phone: s.phone })
    await call('res.partner', 'write', [[supplierId[s.name]], { supplier_rank: 1 }])
  }
  const [wh] = await searchRead('stock.warehouse', [], ['lot_stock_id'], { limit: 1 })
  const locationId = wh.lot_stock_id[0]
  const productId = {}
  const variantId = {}
  for (const i of INGREDIENTS) {
    const values = { name: i.name, type: 'consu', is_storable: true, sale_ok: false, purchase_ok: true, available_in_pos: false, categ_id: categoryId[i.category], uom_id: uomId[i.uom] }
    const id = await ensure('product.template', [['name', '=', i.name], ['sale_ok', '=', false]], values)
    await call('product.template', 'write', [[id], { ...values, active: true }])
    const [tmpl] = await call('product.template', 'read', [[id], ['product_variant_id']])
    productId[i.name] = id; variantId[i.name] = tmpl.product_variant_id[0]
    const sellerId = await ensure('product.supplierinfo', [['product_tmpl_id', '=', id]], { product_tmpl_id: id, partner_id: supplierId[i.supplier], min_qty: 0, price: i.price })
    await call('product.supplierinfo', 'write', [[sellerId], { partner_id: supplierId[i.supplier], price: i.price }])
    const pointId = await ensure('stock.warehouse.orderpoint', [['product_id', '=', variantId[i.name]], ['location_id', '=', locationId]],
      { product_id: variantId[i.name], location_id: locationId, warehouse_id: wh.id, product_min_qty: i.min, product_max_qty: i.max, trigger: 'manual' })
    await call('stock.warehouse.orderpoint', 'write', [[pointId], { product_min_qty: i.min, product_max_qty: i.max, trigger: 'manual' }])
    await setStock(variantId[i.name], locationId, i.stock)
    console.log('ingrediente', i.name, `${i.stock} ${i.uom}`)
  }
  for (const [dish, lines] of Object.entries(RECIPES)) {
    const [tmpl] = await searchRead('product.template', [['name', '=', dish], ['sale_ok', '=', true]], ['uom_id'], { limit: 1 })
    if (!tmpl) { console.log('plato ausente, se omite:', dish); continue }
    const bomLines = lines.map(([name, qty, uom]) => [0, 0, { product_id: variantId[name], product_qty: qty, product_uom_id: uomId[uom] }])
    const [bom] = await searchRead('mrp.bom', [['product_tmpl_id', '=', tmpl.id], ['type', '=', 'phantom']], ['id'], { limit: 1 })
    if (bom) await call('mrp.bom', 'write', [[bom.id], { product_qty: 1, bom_line_ids: [[5, 0, 0], ...bomLines] }])
    else await call('mrp.bom', 'create', [{ product_tmpl_id: tmpl.id, type: 'phantom', product_qty: 1, product_uom_id: tmpl.uom_id[0], bom_line_ids: bomLines }])
    console.log('receta', dish, `${lines.length} ingredientes`)
  }
  console.log('Listo: inventario demo del kit sembrado en', URL, DB)
}

main().catch((e) => { console.error(e.message || e); process.exit(1) })
