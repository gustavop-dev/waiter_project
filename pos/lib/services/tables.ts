import { callKw } from '@/lib/services/odoo'

// Lo que el comensal pidió desde su móvil: llega al salón por Odoo (addon projectapp_ops), nunca por otro canal.
export type CallKind = 'ordering' | 'assist' | 'bill'
export interface TableCall { tableId: number; kind: CallKind; since: string }

export async function listTableCalls(): Promise<TableCall[]> {
  const rows = await callKw<{ id: number; waiter_call: CallKind; waiter_call_at: string | false }[]>('restaurant.table', 'search_read',
    [[['waiter_call', '!=', 'none'], ['active', '=', true]], ['waiter_call', 'waiter_call_at']])
  return rows.map((r) => ({ tableId: r.id, kind: r.waiter_call, since: r.waiter_call_at || '' }))
}

export async function clearTableCall(tableId: number): Promise<void> {
  await callKw('restaurant.table', 'set_waiter_call', [[tableId], 'none'])
}
