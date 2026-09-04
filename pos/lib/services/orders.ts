import { toSyncPayload } from '@/lib/domain/order'
import type { DraftOrder } from '@/lib/domain/order'
import { callKw } from '@/lib/services/odoo'

export interface SavedOrder { id: number; reference: string; state: 'draft' | 'paid'; total: number; tax: number; paid: number }
export interface OpenOrder { id: number; tableId: number; total: number; state: 'draft' | 'paid'; lineCount: number; startedAt: string; waiter: string }
export interface ShiftSummary { sales: number; orders: number; waiters: number }

interface RawOrder { id: number; pos_reference: string; state: SavedOrder['state']; amount_total: number; amount_tax: number; amount_paid: number }
interface RawOpen { id: number; table_id: [number, string] | false; amount_total: number; state: SavedOrder['state']; lines: number[]; date_order: string; user_id: [number, string] | false }
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

export async function closeOrder(orderId: number): Promise<SavedOrder> {
  await callKw<void>('pos.order', 'action_pos_order_paid', [[orderId]])
  return readOrder(orderId)
}

export async function listOpenOrders(sessionId: number): Promise<OpenOrder[]> {
  const rows = await callKw<RawOpen[]>('pos.order', 'search_read',
    [[['session_id', '=', sessionId], ['state', '=', 'draft']], ['table_id', 'amount_total', 'state', 'lines', 'date_order', 'user_id']])
  return rows
    .filter((r) => r.table_id !== false)
    .map((r) => ({ id: r.id, tableId: (r.table_id as [number, string])[0], total: r.amount_total, state: r.state, lineCount: r.lines.length,
      startedAt: r.date_order, waiter: r.user_id ? r.user_id[1] : '' }))
}

// Ventas del turno: lo pagado en la sesión, cuántos pedidos y cuántos meseros distintos.
export async function getShiftSummary(sessionId: number): Promise<ShiftSummary> {
  const rows = await callKw<RawPaid[]>('pos.order', 'search_read',
    [[['session_id', '=', sessionId], ['state', 'in', ['paid', 'done', 'invoiced']]], ['amount_total', 'user_id']])
  const waiters = new Set(rows.map((r) => (r.user_id ? r.user_id[0] : 0)))
  return { sales: rows.reduce((a, r) => a + r.amount_total, 0), orders: rows.length, waiters: waiters.size }
}
