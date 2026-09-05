import { toSyncPayload } from '@/lib/domain/order'
import { kitchenPhase, type KitchenPhase } from '@/lib/domain/kitchen'
import { uuid } from '@/lib/domain/uuid'
import type { DraftOrder } from '@/lib/domain/order'
import { listCourseSummaries } from '@/lib/services/kitchen'
import { callKw } from '@/lib/services/odoo'

export interface SavedOrder { id: number; reference: string; state: 'draft' | 'paid'; total: number; tax: number; paid: number }
export interface OpenOrder { id: number; tableId: number; total: number; tax: number; state: 'draft' | 'paid'; lineCount: number; startedAt: string; waiter: string; kitchen: KitchenPhase }
export interface OrderLineView { uuid: string; name: string; qty: number; unitPrice: number; note: string }
export interface ShiftSummary { sales: number; orders: number; waiters: number }

interface RawOrder { id: number; pos_reference: string; state: SavedOrder['state']; amount_total: number; amount_tax: number; amount_paid: number }
interface RawOpen { id: number; table_id: [number, string] | false; amount_total: number; amount_tax: number; state: SavedOrder['state']; lines: number[]; date_order: string; user_id: [number, string] | false }
interface RawLine { uuid: string; full_product_name: string; qty: number; price_unit: number; customer_note: string | false }
interface RawPaid { amount_total: number; user_id: [number, string] | false }

const READ_FIELDS = ['pos_reference', 'state', 'amount_total', 'amount_tax', 'amount_paid']

async function readOrder(id: number): Promise<SavedOrder> {
  const [raw] = await callKw<RawOrder[]>('pos.order', 'read', [[id], READ_FIELDS])
  return { id: raw.id, reference: raw.pos_reference, state: raw.state, total: raw.amount_total, tax: raw.amount_tax, paid: raw.amount_paid }
}

export async function saveOrder(draft: DraftOrder): Promise<SavedOrder> {
  const result = await callKw<{ 'pos.order': { id: number }[] }>('pos.order', 'sync_from_ui', [[toSyncPayload(draft)]])
  const id = result['pos.order'][0].id
  // sync_from_ui deja amount_total en 0 por la API cruda: el recálculo es obligatorio.
  await callKw<void>('pos.order', 'recompute_prices', [[id]])
  return readOrder(id)
}

export async function payOrder(orderId: number, paymentMethodId: number, amount: number): Promise<SavedOrder> {
  await callKw<void>('pos.order', 'add_payment', [[orderId], { pos_order_id: orderId, payment_method_id: paymentMethodId, amount }])
  return readOrder(orderId)
}

// La propina en Odoo 19 es una línea del producto de propina (no hay set_tip): se agrega, se recalcula y se anota.
export async function addTip(orderId: number, tipProductId: number, amount: number): Promise<SavedOrder> {
  // Sin recompute_prices (pondría el precio de lista del producto de propina) y con amount_total escrito a mano:
  // en Odoo 19 el total del pedido no se recalcula solo al agregar una línea; lo manda el cliente.
  const current = await readOrder(orderId)
  const line = { product_id: tipProductId, qty: 1, price_unit: amount, full_product_name: 'Propina', tax_ids: [[6, 0, []]], price_subtotal: amount, price_subtotal_incl: amount, uuid: uuid() }
  await callKw('pos.order', 'write', [[orderId], { lines: [[0, 0, line]], tip_amount: amount, is_tipped: true, amount_total: current.total + amount }])
  return readOrder(orderId)
}

// Cambio entregado en efectivo: Odoo lo guarda en amount_return.
export async function setChange(orderId: number, amount: number): Promise<void> {
  await callKw('pos.order', 'write', [[orderId], { amount_return: amount }])
}

export async function closeOrder(orderId: number): Promise<SavedOrder> {
  await callKw<void>('pos.order', 'action_pos_order_paid', [[orderId]])
  return readOrder(orderId)
}

export async function listOpenOrders(sessionId: number): Promise<OpenOrder[]> {
  const [rows, courses] = await Promise.all([
    callKw<RawOpen[]>('pos.order', 'search_read',
      [[['session_id', '=', sessionId], ['state', '=', 'draft']], ['table_id', 'amount_total', 'amount_tax', 'state', 'lines', 'date_order', 'user_id']]),
    listCourseSummaries(sessionId),
  ])
  return rows
    .filter((r) => r.table_id !== false)
    .map((r) => ({ id: r.id, tableId: (r.table_id as [number, string])[0], total: r.amount_total, tax: r.amount_tax, state: r.state, lineCount: r.lines.length,
      startedAt: r.date_order, waiter: r.user_id ? r.user_id[1] : '', kitchen: kitchenPhase(courses.filter((c) => c.orderId === r.id)) }))
}

// Líneas de un pedido que vive en Odoo pero no se compuso en este dispositivo (otra tablet, el comensal).
export async function getOrderLines(orderId: number): Promise<OrderLineView[]> {
  const rows = await callKw<RawLine[]>('pos.order.line', 'search_read',
    [[['order_id', '=', orderId]], ['uuid', 'full_product_name', 'qty', 'price_unit', 'customer_note']])
  return rows.map((r) => ({ uuid: r.uuid, name: r.full_product_name, qty: r.qty, unitPrice: r.price_unit, note: r.customer_note || '' }))
}

// Ventas del turno: lo pagado en la sesión, cuántos pedidos y cuántos meseros distintos.
export async function getShiftSummary(sessionId: number): Promise<ShiftSummary> {
  const rows = await callKw<RawPaid[]>('pos.order', 'search_read',
    [[['session_id', '=', sessionId], ['state', 'in', ['paid', 'done', 'invoiced']]], ['amount_total', 'user_id']])
  const waiters = new Set(rows.map((r) => (r.user_id ? r.user_id[0] : 0)))
  return { sales: rows.reduce((a, r) => a + r.amount_total, 0), orders: rows.length, waiters: waiters.size }
}
