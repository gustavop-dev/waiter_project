import { comboChildUuid, type CartLine, type KitOrderPayload } from '@/lib/domain/orderWizard'
import { callKw } from '@/lib/services/odoo'

// Creación del pedido del wizard: mismo sync_from_ui que lib/services/orders.ts, con preset, nombre libre, comensales,
// mesa cuando aplica, valores de atributo por línea y líneas hijas de combo enlazadas a su padre.
export interface CreatedOrder { id: number; reference: string; trackingNumber: string; total: number; tax: number }

interface RawOrder { id: number; pos_reference: string; tracking_number: string | false; amount_total: number; amount_tax: number }
interface RawLine { id: number; uuid: string }

async function linkComboChildren(orderId: number, lines: CartLine[]): Promise<void> {
  const pairs = lines.flatMap((l) => l.options.filter((o) => o.kind === 'combo').map((o) => ({ parent: l.uuid, child: comboChildUuid(l.uuid, o.id) })))
  if (pairs.length === 0) return
  const rows = await callKw<RawLine[]>('pos.order.line', 'search_read', [[['order_id', '=', orderId]], ['uuid']])
  const idOf = (uuid: string) => rows.find((r) => r.uuid === uuid)?.id
  for (const { parent, child } of pairs) {
    const parentId = idOf(parent)
    const childId = idOf(child)
    if (parentId && childId) await callKw('pos.order.line', 'write', [[childId], { combo_parent_id: parentId }])
  }
}

export async function createKitOrder(payload: KitOrderPayload, lines: CartLine[]): Promise<CreatedOrder> {
  const result = await callKw<{ 'pos.order': { id: number }[] }>('pos.order', 'sync_from_ui', [[payload]])
  const id = result['pos.order'][0].id
  // sync_from_ui deja los totales en 0 por la API cruda; el recálculo respeta price_unit cuando attribute_value_ids está enlazado.
  await callKw<void>('pos.order', 'recompute_prices', [[id]])
  await linkComboChildren(id, lines)
  const [raw] = await callKw<RawOrder[]>('pos.order', 'read', [[id], ['pos_reference', 'tracking_number', 'amount_total', 'amount_tax']])
  return { id: raw.id, reference: raw.pos_reference, trackingNumber: raw.tracking_number || String(raw.id), total: raw.amount_total, tax: raw.amount_tax }
}
