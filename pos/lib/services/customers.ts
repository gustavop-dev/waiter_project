import { callKw } from '@/lib/services/odoo'

export interface Customer { id: number; name: string; phone: string; email: string; vat: string; idTypeId: number | null; street: string; city: string; orders: number; invoiced: number }
export interface CustomerInput { name: string; phone: string; email: string; vat: string; idTypeId: number | null; street: string; city: string }
export interface IdType { id: number; name: string }
export interface CustomerOrder { id: number; reference: string; date: string; total: number; state: string }

interface RawPartner { id: number; name: string; phone: string | false; email: string | false; vat: string | false; l10n_latam_identification_type_id: [number, string] | false; street: string | false; city: string | false; pos_order_count: number; total_invoiced: number }
const FIELDS = ['name', 'phone', 'email', 'vat', 'l10n_latam_identification_type_id', 'street', 'city', 'pos_order_count', 'total_invoiced']

const toCustomer = (r: RawPartner): Customer => ({ id: r.id, name: r.name, phone: r.phone || '', email: r.email || '', vat: r.vat || '',
  idTypeId: r.l10n_latam_identification_type_id ? r.l10n_latam_identification_type_id[0] : null, street: r.street || '', city: r.city || '', orders: r.pos_order_count, invoiced: r.total_invoiced })

export async function listCustomers(query = ''): Promise<Customer[]> {
  const domain: unknown[] = [['customer_rank', '>', 0]]
  if (query.trim()) domain.push('|', '|', ['name', 'ilike', query], ['vat', 'ilike', query], ['phone', 'ilike', query])
  const rows = await callKw<RawPartner[]>('res.partner', 'search_read', [domain, FIELDS], { order: 'name asc', limit: 200 })
  return rows.map(toCustomer)
}

export async function saveCustomer(id: number | null, c: CustomerInput): Promise<number> {
  const values = { name: c.name, phone: c.phone || false, email: c.email || false, vat: c.vat || false, l10n_latam_identification_type_id: c.idTypeId ?? false,
    street: c.street || false, city: c.city || false, company_type: 'person' }
  if (id === null) return callKw<number>('res.partner', 'create', [{ ...values, customer_rank: 1 }])
  await callKw('res.partner', 'write', [[id], values])
  return id
}

export async function identificationTypes(): Promise<IdType[]> {
  const rows = await callKw<{ id: number; name: string }[]>('l10n_latam.identification.type', 'search_read', [[], ['name']], { order: 'sequence asc', limit: 20 })
  return rows.map((r) => ({ id: r.id, name: r.name }))
}

// Tarjeta de fidelización del cliente (módulos loyalty + pos_loyalty): la de más puntos si tiene varias; null sin tarjeta.
export interface LoyaltyCard { id: number; points: number; pointsDisplay: string; code: string; program: string; expires: string | null }
interface RawCard { id: number; points: number; points_display: string | false; code: string | false; program_id: [number, string] | false; expiration_date: string | false }

export async function loyaltyCard(partnerId: number): Promise<LoyaltyCard | null> {
  const rows = await callKw<RawCard[]>('loyalty.card', 'search_read', [[['partner_id', '=', partnerId]], ['points', 'points_display', 'code', 'program_id', 'expiration_date']], { order: 'points desc', limit: 1 })
  const r = rows[0]
  if (!r) return null
  return { id: r.id, points: r.points, pointsDisplay: r.points_display || String(r.points), code: r.code || '', program: r.program_id ? r.program_id[1] : '', expires: r.expiration_date || null }
}

export async function customerOrders(partnerId: number): Promise<CustomerOrder[]> {
  const rows = await callKw<{ id: number; pos_reference: string; date_order: string; amount_total: number; state: string }[]>('pos.order', 'search_read',
    [[['partner_id', '=', partnerId]], ['pos_reference', 'date_order', 'amount_total', 'state']], { order: 'id desc', limit: 20 })
  return rows.map((r) => ({ id: r.id, reference: r.pos_reference, date: r.date_order, total: r.amount_total, state: r.state }))
}
