import { callKw } from '@/lib/services/odoo'

export interface InvoiceableOrder { id: number; reference: string; date: string; total: number; partnerId: number | null; partnerName: string; invoiceId: number | null }
export interface Invoice { id: number; name: string; date: string; partner: string; total: number; state: string; paymentState: string }

interface RawOrder { id: number; pos_reference: string; date_order: string; amount_total: number; partner_id: [number, string] | false; account_move: [number, string] | false }
interface RawMove { id: number; name: string; invoice_date: string | false; partner_id: [number, string] | false; amount_total: number; state: string; payment_state: string }
const PAID = ['paid', 'done', 'invoiced']

export async function listPaidOrders(limit = 60): Promise<InvoiceableOrder[]> {
  const rows = await callKw<RawOrder[]>('pos.order', 'search_read', [[['state', 'in', PAID]], ['pos_reference', 'date_order', 'amount_total', 'partner_id', 'account_move']], { order: 'id desc', limit })
  return rows.map((r) => ({ id: r.id, reference: r.pos_reference, date: r.date_order, total: r.amount_total, partnerId: r.partner_id ? r.partner_id[0] : null,
    partnerName: r.partner_id ? r.partner_id[1] : '', invoiceId: r.account_move ? r.account_move[0] : null }))
}

// Factura normal de Odoo (no electrónica): el pedido necesita cliente; Odoo crea y publica el account.move.
export async function invoiceOrder(orderId: number, partnerId: number): Promise<number> {
  await callKw('pos.order', 'write', [[orderId], { partner_id: partnerId }])
  await callKw('pos.order', 'action_pos_order_invoice', [[orderId]])
  const [row] = await callKw<RawOrder[]>('pos.order', 'read', [[orderId], ['account_move']])
  if (!row.account_move) throw new Error('Odoo no devolvió la factura')
  return row.account_move[0]
}

export async function listInvoices(limit = 60): Promise<Invoice[]> {
  const rows = await callKw<RawMove[]>('account.move', 'search_read', [[['move_type', '=', 'out_invoice']], ['name', 'invoice_date', 'partner_id', 'amount_total', 'state', 'payment_state']], { order: 'id desc', limit })
  return rows.map((r) => ({ id: r.id, name: r.name, date: r.invoice_date || '', partner: r.partner_id ? r.partner_id[1] : '', total: r.amount_total, state: r.state, paymentState: r.payment_state }))
}

// El PDF lo genera Odoo; pasa por el proxy same-origin de Next con la cookie de sesión.
export function invoicePdfUrl(invoiceId: number): string {
  return `/odoo/report/pdf/account.report_invoice/${invoiceId}`
}
