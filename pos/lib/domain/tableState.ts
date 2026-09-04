import type { OpenOrder } from '@/lib/services/orders'
import type { Table } from '@/lib/types'

export type TableState = 'free' | 'occupied' | 'kitchen' | 'billing' | 'paid' | 'ordering' | 'served' | 'assist' | 'closed'
export interface LocalFlags { sentToKitchen?: boolean; billing?: boolean; served?: boolean; assist?: boolean; closed?: boolean; ordering?: boolean }
export interface TableView { table: Table; state: TableState; total: number; orderId: number | null }

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
    return { table, state: stateFor(order, flags[table.id] ?? {}), total: order?.total ?? 0, orderId: order?.id ?? null }
  })
}

export function countByState(views: TableView[]): Record<TableState, number> {
  const counts = Object.fromEntries(STATES.map((s) => [s, 0])) as Record<TableState, number>
  views.forEach((v) => { counts[v.state] += 1 })
  return counts
}
