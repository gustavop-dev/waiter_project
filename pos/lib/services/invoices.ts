import { callKw } from '@/lib/services/odoo'

export interface InvoicePayment { methodId: number; method: string; amount: number }
export interface InvoiceableOrder { id: number; reference: string; date: string; total: number; tax: number; tableId: number | null; partnerId: number | null; partnerName: string; invoiceId: number | null; payments: InvoicePayment[]; tip?: number }
export interface Invoice { id: number; name: string; date: string; partner: string; total: number; state: string; paymentState: string; type?: string }
export interface OrderLine { id: number; name: string; qty: number; unit: number; total: number; subtotal: number; discount: number }

interface RawOrder { id: number; pos_reference: string; date_order: string; amount_total: number; amount_tax: number; tip_amount: number; table_id: [number, string] | false; partner_id: [number, string] | false; account_move: [number, string] | false }
interface RawMove { id: number; name: string; invoice_date: string | false; partner_id: [number, string] | false; amount_total: number; state: string; payment_state: string; move_type: string }
interface RawLine { id: number; full_product_name: string; qty: number; price_unit: number; price_subtotal_incl: number; price_subtotal: number; discount: number }
const PAID = ['paid', 'done', 'invoiced']

export interface BillingQuery { offset?: number; query?: string; paymentMethodId?: number | null; pendingOnly?: boolean }

// Los filtros actúan en la consulta, antes de paginar. Nunca cambian documentos ni obligaciones fiscales.
export async function listPaidOrders(limit = 60, filters: BillingQuery = {}): Promise<InvoiceableOrder[]> {
  const domain: unknown[] = [['state', 'in', PAID]]
  if (filters.pendingOnly) domain.push(['account_move', '=', false])
  if (filters.paymentMethodId) domain.push(['payment_ids.payment_method_id', '=', filters.paymentMethodId])
  const q = filters.query?.trim()
  if (q) {
    if (/^\d+$/.test(q)) domain.push('|', ['id', '=', Number(q)])
    domain.push('|', ['pos_reference', 'ilike', q], ['partner_id.name', 'ilike', q])
  }
  const rows = await callKw<RawOrder[]>('pos.order', 'search_read', [domain, ['pos_reference', 'date_order', 'amount_total', 'amount_tax', 'tip_amount', 'table_id', 'partner_id', 'account_move']], { order: 'id desc', limit, offset: filters.offset ?? 0 })
  const payments = rows.length ? await callKw<{ pos_order_id: [number, string]; payment_method_id: [number, string]; amount: number }[]>('pos.payment', 'search_read',
    [[['pos_order_id', 'in', rows.map((r) => r.id)]], ['pos_order_id', 'payment_method_id', 'amount']], { order: 'id asc' }) : []
  return rows.map((r) => {
    const byMethod = new Map<number, InvoicePayment>()
    for (const p of payments.filter((p) => p.pos_order_id[0] === r.id)) {
      const id = p.payment_method_id[0]
      const previous = byMethod.get(id)
      byMethod.set(id, { methodId: id, method: p.payment_method_id[1], amount: (previous?.amount ?? 0) + p.amount })
    }
    return { id: r.id, reference: r.pos_reference, date: r.date_order, total: r.amount_total, tax: r.amount_tax, tip: r.tip_amount ?? 0, tableId: r.table_id ? r.table_id[0] : null,
      partnerId: r.partner_id ? r.partner_id[0] : null, partnerName: r.partner_id ? r.partner_id[1] : '', invoiceId: r.account_move ? r.account_move[0] : null,
      payments: [...byMethod.values()].filter((p) => Math.abs(p.amount) > 0.005) }
  })
}

// Líneas del pedido para el panel "Información de la factura" (precio unitario × cantidad, total con impuesto).
export async function orderLines(orderId: number): Promise<OrderLine[]> {
  const rows = await callKw<RawLine[]>('pos.order.line', 'search_read', [[['order_id', '=', orderId]], ['full_product_name', 'qty', 'price_unit', 'price_subtotal_incl', 'price_subtotal', 'discount']], { order: 'id asc' })
  return rows.map((r) => ({ id: r.id, name: r.full_product_name, qty: r.qty, unit: r.price_unit, total: r.price_subtotal_incl, subtotal: r.price_subtotal, discount: r.discount }))
}

export interface BillingReview { company: string; journal: string; currency: string; tip: number; issues: string[]; ready: boolean }
export interface AccountingDetail {
  ready: boolean; issues: string[]; company: string; journal: string; date: string; origin: string;
  currency: string; companyCurrency: string; untaxed: number; tax: number; total: number; residual: number;
  tip: number; debit: number; credit: number; original: string;
  lines: { id: number; account: string; label: string; debit: number; credit: number }[];
  taxes: { id: number; name: string; amount: number }[];
}

export function reviewOrder(orderId: number, partnerId: number | null): Promise<BillingReview> {
  return callKw('pos.order', 'waiter_billing_review', [[orderId], partnerId || false, partnerId === null])
}

// Una sola transacción en Odoo: valida, asigna cliente, contabiliza y concilia. No envía a la DIAN.
export function invoiceOrder(orderId: number, partnerId: number | null): Promise<number> {
  return callKw('pos.order', 'waiter_account_invoice', [[orderId], partnerId || false, partnerId === null])
}

export function accountingDetail(invoiceId: number): Promise<AccountingDetail> {
  return callKw('account.move', 'waiter_accounting_detail', [[invoiceId]])
}

const MOVE_FIELDS = ['name', 'invoice_date', 'partner_id', 'amount_total', 'state', 'payment_state', 'move_type']
const mapInvoice = (r: RawMove): Invoice => ({ id: r.id, name: r.name, date: r.invoice_date || '', partner: r.partner_id ? r.partner_id[1] : '', total: r.amount_total, state: r.state, paymentState: r.payment_state, type: r.move_type })

export async function listInvoices(limit = 60, filters: Pick<BillingQuery, 'offset' | 'query'> = {}): Promise<Invoice[]> {
  const domain: unknown[] = [['move_type', 'in', ['out_invoice', 'out_refund']], ['pos_order_ids', '!=', false]]
  if (filters.query?.trim()) domain.push('|', ['name', 'ilike', filters.query.trim()], ['partner_id.name', 'ilike', filters.query.trim()])
  const rows = await callKw<RawMove[]>('account.move', 'search_read', [domain, MOVE_FIELDS], { order: 'id desc', limit, offset: filters.offset ?? 0 })
  return rows.map(mapInvoice)
}

export async function getInvoice(id: number): Promise<Invoice | null> {
  const [row] = await callKw<RawMove[]>('account.move', 'read', [[id], MOVE_FIELDS])
  return row ? mapInvoice(row) : null
}

// El PDF lo genera Odoo; pasa por el proxy same-origin de Next con la cookie de sesión.
export function invoicePdfUrl(invoiceId: number): string {
  return `/odoo/report/pdf/account.report_invoice/${invoiceId}`
}

export interface BillingSettings {
  company: string; journal: string; currency: string; tipProduct: string;
  tipAccountId: number | null; tipAccount: string; accounts: { id: number; name: string }[];
}
export function billingSettings(configId: number): Promise<BillingSettings> {
  return callKw('pos.config', 'waiter_billing_settings', [[configId]])
}
export function setTipAccount(configId: number, accountId: number): Promise<BillingSettings> {
  return callKw('pos.config', 'waiter_set_tip_account', [[configId], accountId])
}
