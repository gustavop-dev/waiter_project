import { kitchenPhase, type KitchenPhase } from '@/lib/domain/kitchen'
import { listCourseSummaries } from '@/lib/services/kitchen'
import { callKw } from '@/lib/services/odoo'

export type Origin = 'waiter' | 'diner' | 'ai'
export interface ShiftOrder {
  id: number; reference: string; tableId: number | null; tableNumber: number | null; waiter: string; origin: Origin
  total: number; state: 'draft' | 'paid' | 'done' | 'invoiced' | 'cancel'; kitchen: KitchenPhase; firedAt: string | null; startedAt: string
}
export interface Autonomy { autonomous: number; total: number }

interface RawShiftOrder { id: number; pos_reference: string; table_id: [number, string] | false; user_id: [number, string] | false; waiter_origin: Origin | false; amount_total: number; state: ShiftOrder['state']; date_order: string }

// Todos los pedidos del turno (abiertos y pagados), con su origen y en qué va cocina. Dos llamadas.
export async function listShiftOrders(sessionId: number, tableNumberOf: (tableId: number) => number | null): Promise<ShiftOrder[]> {
  const [rows, courses] = await Promise.all([
    callKw<RawShiftOrder[]>('pos.order', 'search_read',
      [[['session_id', '=', sessionId], ['state', '!=', 'cancel']], ['pos_reference', 'table_id', 'user_id', 'waiter_origin', 'amount_total', 'state', 'date_order']], { order: 'id desc' }),
    listCourseSummaries(sessionId),
  ])
  return rows.map((r) => {
    const mine = courses.filter((c) => c.orderId === r.id)
    const pending = mine.filter((c) => c.readyAt === null)
    return {
      id: r.id, reference: r.pos_reference, tableId: r.table_id ? r.table_id[0] : null, tableNumber: r.table_id ? tableNumberOf(r.table_id[0]) : null,
      waiter: r.user_id ? r.user_id[1] : '', origin: r.waiter_origin || 'waiter', total: r.amount_total, state: r.state,
      kitchen: kitchenPhase(mine), firedAt: pending.length ? pending.map((c) => c.firedAt).sort()[0] : null, startedAt: r.date_order,
    }
  })
}

// "Sin intervención humana": pedidos del día que no originó un mesero.
export async function countAutonomy(sessionId: number): Promise<Autonomy> {
  const rows = await callKw<{ waiter_origin: Origin | false }[]>('pos.order', 'search_read', [[['session_id', '=', sessionId], ['state', '!=', 'cancel']], ['waiter_origin']])
  return { total: rows.length, autonomous: rows.filter((r) => r.waiter_origin && r.waiter_origin !== 'waiter').length }
}
