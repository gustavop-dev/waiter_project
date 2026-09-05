import { callKw } from '@/lib/services/odoo'
import type { Role } from '@/lib/domain/roles'
import type { Settings } from '@/lib/types'

export interface CompanyInfo { id: number; name: string; vat: string; phone: string; email: string; street: string; city: string }
export interface FloorInfo { id: number; name: string; tables: { id: number; number: number; seats: number; active: boolean }[] }
export interface UserInfo { id: number; name: string; login: string; lastLogin: string | null; role: Role }
export interface PaymentMethodInfo { id: number; name: string; type: string }
export interface TaxInfo { id: number; name: string; amount: number }

interface RawCompany { id: number; name: string; vat: string | false; phone: string | false; email: string | false; street: string | false; city: string | false }
interface RawFloor { id: number; name: string; table_ids: number[] }
interface RawTable { id: number; table_number: number; seats: number; active: boolean; floor_id: [number, string] }

export async function getCompany(): Promise<CompanyInfo> {
  const [c] = await callKw<RawCompany[]>('res.company', 'search_read', [[], ['name', 'vat', 'phone', 'email', 'street', 'city']], { limit: 1 })
  return { id: c.id, name: c.name, vat: c.vat || '', phone: c.phone || '', email: c.email || '', street: c.street || '', city: c.city || '' }
}

export async function saveCompany(c: CompanyInfo): Promise<void> {
  await callKw('res.company', 'write', [[c.id], { name: c.name, vat: c.vat || false, phone: c.phone || false, email: c.email || false, street: c.street || false, city: c.city || false }])
}

export async function listFloors(): Promise<FloorInfo[]> {
  const [floors, tables] = await Promise.all([
    callKw<RawFloor[]>('restaurant.floor', 'search_read', [[], ['name', 'table_ids']], { order: 'sequence asc, id asc' }),
    callKw<RawTable[]>('restaurant.table', 'search_read', [[['active', 'in', [true, false]]], ['table_number', 'seats', 'active', 'floor_id']], { order: 'table_number asc' }),
  ])
  return floors.map((f) => ({ id: f.id, name: f.name, tables: tables.filter((t) => t.floor_id[0] === f.id).map((t) => ({ id: t.id, number: t.table_number, seats: t.seats, active: t.active })) }))
}

export async function saveFloor(id: number | null, name: string, configId: number): Promise<number> {
  if (id === null) return callKw<number>('restaurant.floor', 'create', [{ name, pos_config_ids: [[4, configId]] }])
  await callKw('restaurant.floor', 'write', [[id], { name }])
  return id
}

export async function saveTable(id: number | null, floorId: number, t: { number: number; seats: number; active: boolean }): Promise<number> {
  const values = { table_number: t.number, seats: t.seats, active: t.active, floor_id: floorId }
  if (id === null) return callKw<number>('restaurant.table', 'create', [{ ...values, position_h: 20 + (t.number % 5) * 120, position_v: 20 + Math.floor(t.number / 5) * 120 }])
  await callKw('restaurant.table', 'write', [[id], values])
  return id
}

export async function listPaymentMethods(): Promise<PaymentMethodInfo[]> {
  return callKw<PaymentMethodInfo[]>('pos.payment.method', 'search_read', [[], ['name', 'type']], { order: 'sequence asc, id asc' })
}

export async function listTaxes(): Promise<TaxInfo[]> {
  return callKw<TaxInfo[]>('account.tax', 'search_read', [[['type_tax_use', '=', 'sale']], ['name', 'amount']], { order: 'amount desc' })
}

export async function listUsers(): Promise<UserInfo[]> {
  const rows = await callKw<{ id: number; name: string; login: string; login_date: string | false; waiter_role: Role | false }[]>('res.users', 'search_read', [[['share', '=', false]], ['name', 'login', 'login_date', 'waiter_role']], { order: 'name asc' })
  return rows.map((r) => ({ id: r.id, name: r.name, login: r.login, lastLogin: r.login_date || null, role: r.waiter_role || 'waiter' }))
}

export async function createUser(u: { name: string; login: string; password: string; role: Role }): Promise<number> {
  return callKw<number>('res.users', 'create', [{ name: u.name, login: u.login, password: u.password, waiter_role: u.role }])
}

// Cambiar el rol reasigna los grupos de Odoo (lo hace el addon).
export async function setUserRole(id: number, role: Role): Promise<void> {
  await callKw('res.users', 'write', [[id], { waiter_role: role }])
}

export async function saveSettings(s: Settings): Promise<void> {
  await callKw('pos.config', 'write', [[s.configId], {
    alert_late_minutes: s.alertLateMinutes, alert_bill_minutes: s.alertBillMinutes, roi_hour_cost: s.roiHourCost, roi_minutes_per_order: s.roiMinutesPerOrder,
    roi_baseline_hours_per_100: s.roiBaselineHoursPer100, roi_monthly_cost: s.roiMonthlyCost, roi_start_date: s.roiStartDate || false,
  }])
}
