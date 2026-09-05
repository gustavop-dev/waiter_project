import { callKw } from '@/lib/services/odoo'
import type { Origin } from '@/lib/services/ops'

export interface ShiftRow { id: number; name: string; state: string; startAt: string; stopAt: string | null; user: string; total: number; orders: number }
export interface MethodTotal { method: string; amount: number }
export interface WaiterTotal { waiter: string; amount: number; orders: number }
export interface ProductTotal { product: string; qty: number; amount: number }
export interface SaleRow { id: number; reference: string; paidAt: string; tableNumber: number | null; waiter: string; origin: Origin; total: number }

interface RawSession { id: number; name: string; state: string; start_at: string; stop_at: string | false; user_id: [number, string] | false; total_payments_amount: number; order_count: number }
interface RawSale { id: number; pos_reference: string; date_order: string; table_id: [number, string] | false; user_id: [number, string] | false; waiter_origin: Origin | false; amount_total: number }
const PAID = ['paid', 'done', 'invoiced']

export async function listShifts(limit = 12): Promise<ShiftRow[]> {
  const rows = await callKw<RawSession[]>('pos.session', 'search_read', [[], ['name', 'state', 'start_at', 'stop_at', 'user_id', 'total_payments_amount', 'order_count']], { limit, order: 'id desc' })
  return rows.map((r) => ({ id: r.id, name: r.name, state: r.state, startAt: r.start_at, stopAt: r.stop_at || null, user: r.user_id ? r.user_id[1] : '', total: r.total_payments_amount, orders: r.order_count }))
}

export async function listSales(sessionId: number, tableNumberOf: (id: number) => number | null): Promise<SaleRow[]> {
  const rows = await callKw<RawSale[]>('pos.order', 'search_read',
    [[['session_id', '=', sessionId], ['state', 'in', PAID]], ['pos_reference', 'date_order', 'table_id', 'user_id', 'waiter_origin', 'amount_total']], { order: 'id desc' })
  return rows.map((r) => ({ id: r.id, reference: r.pos_reference, paidAt: r.date_order, tableNumber: r.table_id ? tableNumberOf(r.table_id[0]) : null,
    waiter: r.user_id ? r.user_id[1] : '', origin: r.waiter_origin || 'waiter', total: r.amount_total }))
}

// read_group de Odoo: cada fila trae el campo agrupado como [id, nombre] y las sumas por nombre de campo.
export async function paymentsByMethod(sessionId: number): Promise<MethodTotal[]> {
  const rows = await callKw<{ payment_method_id: [number, string]; amount: number }[]>('pos.payment', 'read_group',
    [[['session_id', '=', sessionId]], ['amount:sum'], ['payment_method_id']], { lazy: false })
  return rows.map((r) => ({ method: r.payment_method_id[1], amount: r.amount })).sort((a, b) => b.amount - a.amount)
}

export async function salesByWaiter(sessionId: number): Promise<WaiterTotal[]> {
  const rows = await callKw<{ user_id: [number, string] | false; amount_total: number; __count: number }[]>('pos.order', 'read_group',
    [[['session_id', '=', sessionId], ['state', 'in', PAID]], ['amount_total:sum'], ['user_id']], { lazy: false })
  return rows.map((r) => ({ waiter: r.user_id ? r.user_id[1] : '—', amount: r.amount_total, orders: r.__count })).sort((a, b) => b.amount - a.amount)
}

export async function topProducts(sessionId: number, limit = 6): Promise<ProductTotal[]> {
  const rows = await callKw<{ product_id: [number, string]; qty: number; price_subtotal_incl: number }[]>('pos.order.line', 'read_group',
    [[['order_id.session_id', '=', sessionId], ['order_id.state', 'in', PAID]], ['qty:sum', 'price_subtotal_incl:sum'], ['product_id']], { lazy: false, orderby: 'price_subtotal_incl desc', limit })
  return rows.map((r) => ({ product: r.product_id[1], qty: r.qty, amount: r.price_subtotal_incl }))
}
