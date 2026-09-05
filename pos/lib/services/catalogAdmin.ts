import { callKw } from '@/lib/services/odoo'

export interface AdminProduct { id: number; name: string; price: number; categoryIds: number[]; taxIds: number[]; available: boolean; storable: boolean; favorite: boolean; description: string }
export interface AdminCategory { id: number; name: string; sequence: number; station: string | null }
export interface Tax { id: number; name: string; amount: number }
export type ProductInput = Omit<AdminProduct, 'id'>

interface RawTemplate { id: number; name: string; list_price: number; pos_categ_ids: number[]; taxes_id: number[]; available_in_pos: boolean; is_storable: boolean; is_favorite: boolean; description_sale: string | false }
interface RawCategory { id: number; name: string; sequence: number; kitchen_station: string | false }

const TEMPLATE_FIELDS = ['name', 'list_price', 'pos_categ_ids', 'taxes_id', 'available_in_pos', 'is_storable', 'is_favorite', 'description_sale']

export async function listProducts(): Promise<AdminProduct[]> {
  const rows = await callKw<RawTemplate[]>('product.template', 'search_read', [[['type', '=', 'consu'], ['sale_ok', '=', true]], TEMPLATE_FIELDS], { order: 'name asc' })
  return rows.map((r) => ({ id: r.id, name: r.name, price: r.list_price, categoryIds: r.pos_categ_ids, taxIds: r.taxes_id, available: r.available_in_pos,
    storable: r.is_storable, favorite: r.is_favorite, description: r.description_sale || '' }))
}

function toValues(p: ProductInput) {
  return { name: p.name, list_price: p.price, pos_categ_ids: [[6, 0, p.categoryIds]], taxes_id: [[6, 0, p.taxIds]], available_in_pos: p.available,
    is_storable: p.storable, is_favorite: p.favorite, description_sale: p.description || false, type: 'consu', sale_ok: true }
}

export async function saveProduct(id: number | null, p: ProductInput): Promise<number> {
  if (id === null) return callKw<number>('product.template', 'create', [toValues(p)])
  await callKw('product.template', 'write', [[id], toValues(p)])
  return id
}

export async function listCategories(): Promise<AdminCategory[]> {
  const rows = await callKw<RawCategory[]>('pos.category', 'search_read', [[], ['name', 'sequence', 'kitchen_station']], { order: 'sequence asc, id asc' })
  return rows.map((r) => ({ id: r.id, name: r.name, sequence: r.sequence, station: r.kitchen_station || null }))
}

export async function saveCategory(id: number | null, c: { name: string; station: string | null }): Promise<number> {
  const values = { name: c.name, kitchen_station: c.station || false }
  if (id === null) return callKw<number>('pos.category', 'create', [values])
  await callKw('pos.category', 'write', [[id], values])
  return id
}

export async function listTaxes(): Promise<Tax[]> {
  const rows = await callKw<{ id: number; name: string; amount: number }[]>('account.tax', 'search_read', [[['type_tax_use', '=', 'sale'], ['amount', '>=', 0]], ['name', 'amount']], { order: 'amount desc' })
  return rows.map((r) => ({ id: r.id, name: r.name, amount: r.amount }))
}
