import { uuid } from '@/lib/domain/uuid'
import type { Product } from '@/lib/types'

export interface DraftLine { uuid: string; productId: number; name: string; unitPrice: number; qty: number; note: string; taxIds: number[] }
export interface DraftOrder { uuid: string; serverId: number | null; sessionId: number; tableId: number; guests: number; note: string; lines: DraftLine[] }

type LineCommand = [0, 0, Record<string, unknown>]
export interface SyncOrderPayload {
  id: number; uuid: string; session_id: number; table_id: number; customer_count: number
  sequence_number: number; state: 'draft'; general_customer_note: string; amount_total: number; amount_tax: number
  amount_paid: number; amount_return: number; date_order: string; lines: LineCommand[]
}

export function createDraft({ sessionId, tableId, guests = 1 }: { sessionId: number; tableId: number; guests?: number }): DraftOrder {
  return { uuid: uuid(), serverId: null, sessionId, tableId, guests, note: '', lines: [] }
}

export function addProduct(order: DraftOrder, product: Product): DraftOrder {
  const existing = order.lines.find((l) => l.productId === product.id && l.note === '')
  if (existing) return setQty(order, existing.uuid, existing.qty + 1)
  const line: DraftLine = { uuid: uuid(), productId: product.id, name: product.name,
    unitPrice: product.price, qty: 1, note: '', taxIds: product.taxIds }
  return { ...order, lines: [...order.lines, line] }
}

export function setQty(order: DraftOrder, lineUuid: string, qty: number): DraftOrder {
  if (qty <= 0) return removeLine(order, lineUuid)
  return { ...order, lines: order.lines.map((l) => (l.uuid === lineUuid ? { ...l, qty } : l)) }
}

export function setNote(order: DraftOrder, lineUuid: string, note: string): DraftOrder {
  return { ...order, lines: order.lines.map((l) => (l.uuid === lineUuid ? { ...l, note } : l)) }
}

export function removeLine(order: DraftOrder, lineUuid: string): DraftOrder {
  return { ...order, lines: order.lines.filter((l) => l.uuid !== lineUuid) }
}

// Nota general a cocina ("alergia en la mesa", "todo junto"): viaja en general_customer_note y la ve el KDS.
export function setOrderNote(order: DraftOrder, note: string): DraftOrder {
  return { ...order, note }
}

export function subtotal(order: DraftOrder): number {
  return order.lines.reduce((acc, l) => acc + l.unitPrice * l.qty, 0)
}

function nowForOdoo(): string {
  return new Date().toISOString().slice(0, 19).replace('T', ' ')
}

export function toSyncPayload(order: DraftOrder): SyncOrderPayload {
  return {
    id: order.serverId ?? -1, uuid: order.uuid, session_id: order.sessionId, table_id: order.tableId,
    customer_count: order.guests, sequence_number: 1, state: 'draft', general_customer_note: order.note,
    amount_total: 0, amount_tax: 0, amount_paid: 0, amount_return: 0, date_order: nowForOdoo(),
    lines: order.lines.map((l) => [0, 0, {
      id: -1, uuid: l.uuid, product_id: l.productId, qty: l.qty, price_unit: l.unitPrice,
      tax_ids: [[6, 0, l.taxIds]], price_subtotal: 0, price_subtotal_incl: 0,
      full_product_name: l.name, customer_note: l.note,
    }]),
  }
}
