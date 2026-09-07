import type { LowStockRow, ReadyDish } from '@/lib/domain/notifications'
import { callKw } from '@/lib/services/odoo'

// Fuentes reales del centro de notificaciones mientras no exista `waiter.notification` en Odoo:
// stock bajo = stock.warehouse.orderpoint por debajo del mínimo; plato listo = curso con ready_date y sin served_date.
interface RawOrderpoint { id: number; product_id: [number, string]; product_min_qty: number; product_max_qty: number; qty_on_hand: number; write_date: string }
interface RawPoLine { product_id: [number, string] }
interface RawCourse { id: number; order_id: [number, string]; ready_date: string; line_ids: number[] }
interface RawLine { id: number; full_product_name: string; qty: number }
interface RawOrder { id: number; table_id: [number, string] | false }
interface RawSeller { partner_id: [number, string] }

export class NoSupplierError extends Error { constructor() { super('no-supplier'); this.name = 'NoSupplierError' } }

export async function listLowStock(): Promise<LowStockRow[]> {
  const points = await callKw<RawOrderpoint[]>('stock.warehouse.orderpoint', 'search_read', [[], ['product_id', 'product_min_qty', 'product_max_qty', 'qty_on_hand', 'write_date']])
  const low = points.filter((p) => p.qty_on_hand < p.product_min_qty)
  if (low.length === 0) return []
  const pending = await callKw<RawPoLine[]>('purchase.order.line', 'search_read',
    [[['product_id', 'in', low.map((p) => p.product_id[0])], ['order_id.state', 'in', ['draft', 'sent']]], ['product_id']])
  const requested = new Set(pending.map((l) => l.product_id[0]))
  return low.map((p) => ({ productId: p.product_id[0], name: p.product_id[1], qtyOnHand: p.qty_on_hand, minQty: p.product_min_qty, requested: requested.has(p.product_id[0]), at: p.write_date }))
}

// Un aviso por curso listo: los platos del curso y la mesa del pedido.
export async function listReadyDishes(sessionId: number): Promise<ReadyDish[]> {
  const courses = await callKw<RawCourse[]>('restaurant.order.course', 'search_read',
    [[['fired', '=', true], ['ready_date', '!=', false], ['served_date', '=', false], ['order_id.session_id', '=', sessionId], ['order_id.state', '=', 'draft']], ['order_id', 'ready_date', 'line_ids']])
  if (courses.length === 0) return []
  const [lines, orders] = await Promise.all([
    callKw<RawLine[]>('pos.order.line', 'read', [courses.flatMap((c) => c.line_ids), ['full_product_name', 'qty']]),
    callKw<RawOrder[]>('pos.order', 'read', [[...new Set(courses.map((c) => c.order_id[0]))], ['table_id']]),
  ])
  return courses.map((c) => {
    const order = orders.find((o) => o.id === c.order_id[0])
    const names = c.line_ids.map((id) => lines.find((l) => l.id === id)).filter((l): l is RawLine => Boolean(l)).map((l) => (l.qty > 1 ? `${l.qty} × ${l.full_product_name}` : l.full_product_name))
    return { courseId: c.id, dish: names.join(', '), table: order?.table_id ? order.table_id[1] : '—', at: c.ready_date }
  })
}

// "Solicitar ingredientes": orden de compra en borrador al proveedor de product.supplierinfo (hasta el máximo del orderpoint).
export async function requestIngredients(row: LowStockRow): Promise<number> {
  const sellers = await callKw<RawSeller[]>('product.supplierinfo', 'search_read',
    [['|', ['product_id', '=', row.productId], ['product_tmpl_id.product_variant_ids', 'in', [row.productId]]], ['partner_id']], { limit: 1, order: 'sequence asc' })
  if (sellers.length === 0) throw new NoSupplierError()
  const [point] = await callKw<{ product_max_qty: number }[]>('stock.warehouse.orderpoint', 'search_read', [[['product_id', '=', row.productId]], ['product_max_qty']], { limit: 1 })
  const target = Math.max(point?.product_max_qty ?? 0, row.minQty)
  const qty = Math.max(1, target - row.qtyOnHand)
  return callKw<number>('purchase.order', 'create', [{ partner_id: sellers[0].partner_id[0], origin: 'Waiter POS', order_line: [[0, 0, { product_id: row.productId, product_qty: qty }]] }])
}
