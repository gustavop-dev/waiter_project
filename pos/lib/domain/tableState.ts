import type { OpenOrder } from '@/lib/services/orders'
import type { Table } from '@/lib/types'

export type TableState = 'free' | 'occupied' | 'kitchen' | 'billing' | 'paid' | 'ordering' | 'served' | 'assist' | 'closed'
export interface LocalFlags { sentToKitchen?: boolean; billing?: boolean; served?: boolean; assist?: boolean; closed?: boolean; ordering?: boolean }
export interface TableView { table: Table; state: TableState; total: number; tax: number; orderId: number | null; startedAt: string | null; waiter: string | null }

const STATES: TableState[] = ['free', 'occupied', 'kitchen', 'billing', 'paid', 'ordering', 'served', 'assist', 'closed']

// Odoo solo sabe libre / con pedido / pagado. Lo demás es estado local de la app (o del registro
// central más adelante). Prioridad cuando coinciden: closed > assist > billing > served > kitchen.
function stateFor(order: OpenOrder | undefined, flags: LocalFlags): TableState {
  if (flags.closed) return 'closed'
  if (flags.assist) return 'assist'
  if (!order) return flags.ordering ? 'ordering' : 'free'
  if (flags.billing) return 'billing'
  if (flags.served) return 'served'
  if (flags.sentToKitchen) return 'kitchen'
  return 'occupied'
}

export function deriveTableViews(tables: Table[], orders: OpenOrder[], flags: Record<number, LocalFlags>): TableView[] {
  return tables.map((table) => {
    const order = orders.find((o) => o.tableId === table.id)
    return { table, state: stateFor(order, flags[table.id] ?? {}), total: order?.total ?? 0, tax: order?.tax ?? 0, orderId: order?.id ?? null,
      startedAt: order?.startedAt ?? null, waiter: order?.waiter ?? null }
  })
}

export function countByState(views: TableView[]): Record<TableState, number> {
  const counts = Object.fromEntries(STATES.map((s) => [s, 0])) as Record<TableState, number>
  views.forEach((v) => { counts[v.state] += 1 })
  return counts
}

// date_order de Odoo viene en UTC sin zona ("2026-09-04 23:16:43").
export function elapsedMinutes(startedAt: string, now: number): number {
  const t = Date.parse(startedAt.replace(' ', 'T') + 'Z')
  return Math.max(0, Math.floor((now - t) / 60_000))
}

// "0:34", "1:12" — horas:minutos, como en las celdas del diseño.
export function formatElapsed(minutes: number): string {
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, '0')}`
}

// Barra de 22 minutos con marcas a los 12 y 18, como el KDS del sistema Waiter.
export const BAR_SCALE_MIN = 22
export function barFill(minutes: number): number {
  return Math.min(100, Math.round((minutes / BAR_SCALE_MIN) * 100))
}
export function barTone(minutes: number): 'ok' | 'warn' | 'late' {
  return minutes >= 18 ? 'late' : minutes >= 12 ? 'warn' : 'ok'
}
