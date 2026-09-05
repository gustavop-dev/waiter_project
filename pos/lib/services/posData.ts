import { callKw } from '@/lib/services/odoo'
import type { Catalog, Category, Floor, PaymentMethod, Product, Settings, Table } from '@/lib/types'

// Formas REALES de load_data (capturadas contra Odoo 19, no supuestas): los many2one llegan
// como enteros pelados, y precio/categorías/impuestos viven en product.template.
interface RawProduct { id: number; product_tmpl_id: number; display_name: string; lst_price: number }
interface RawTemplate { id: number; name: string; list_price: number; pos_categ_ids: number[]; taxes_id: number[]; available_in_pos: boolean; active: boolean; is_favorite: boolean; is_storable: boolean; image_128: string | false }
interface RawCategory { id: number; name: string; sequence: number; kitchen_station: string | false }
interface RawFloor { id: number; name: string; table_ids: number[] }
interface RawTable { id: number; table_number: number; floor_id: number; seats: number; active: boolean }
interface RawMethod { id: number; name: string; type: PaymentMethod['type'] }
interface RawCompany { id: number; name: string }
interface RawConfig { id: number; name: string; alert_late_minutes: number; alert_bill_minutes: number; roi_hour_cost: number; roi_minutes_per_order: number; roi_baseline_hours_per_100: number; roi_monthly_cost: number; roi_start_date: string | false; tip_product_id: number | false }
interface RawLoad {
  'product.product': RawProduct[]; 'product.template': RawTemplate[]; 'pos.category': RawCategory[]
  'restaurant.floor': RawFloor[]; 'restaurant.table': RawTable[]; 'pos.payment.method': RawMethod[]; 'res.company': RawCompany[]; 'pos.config': RawConfig[]
}

// "Agotado" solo aplica a productos almacenables: un consumible sin control de stock tiene qty 0 siempre.
async function soldOutIds(products: Product[]): Promise<Set<number>> {
  const ids = products.filter((p) => p.storable).map((p) => p.id)
  if (ids.length === 0) return new Set()
  const rows = await callKw<{ id: number; qty_available: number }[]>('product.product', 'search_read', [[['id', 'in', ids]], ['qty_available']])
  return new Set(rows.filter((r) => r.qty_available <= 0).map((r) => r.id))
}

export async function loadPosData(sessionId: number): Promise<Catalog> {
  // Todos los modelos, como lo hace el propio cliente de Odoo: los cargadores se leen entre sí
  // desde data[...] y una lista parcial rompe con KeyError en cada actualización.
  const raw = await callKw<RawLoad>('pos.session', 'load_data', [[sessionId], []])

  const templates = new Map(raw['product.template'].filter((t) => t.available_in_pos && t.active).map((t) => [t.id, t]))
  const base: Product[] = raw['product.product'].flatMap((p) => {
    const t = templates.get(p.product_tmpl_id)
    return t ? [{ id: p.id, templateId: t.id, name: t.name, price: t.list_price, categoryIds: t.pos_categ_ids, taxIds: t.taxes_id,
      favorite: Boolean(t.is_favorite), storable: Boolean(t.is_storable), soldOut: false, hasImage: Boolean(t.image_128) }] : []
  })
  const out = await soldOutIds(base)
  const products = base.map((p) => ({ ...p, soldOut: out.has(p.id) }))
  const categories: Category[] = raw['pos.category'].map(({ id, name, sequence, kitchen_station }) => ({ id, name, sequence, station: kitchen_station || null }))
  const floors: Floor[] = raw['restaurant.floor'].map(({ id, name, table_ids }) => ({ id, name, tableIds: table_ids }))
  const tables: Table[] = raw['restaurant.table'].filter((t) => t.active)
    .map((t) => ({ id: t.id, number: t.table_number, floorId: t.floor_id, seats: t.seats }))
  const paymentMethods: PaymentMethod[] = raw['pos.payment.method'].map(({ id, name, type }) => ({ id, name, type }))
  const company = { name: raw['res.company'][0]?.name ?? '' }
  const c = raw['pos.config'][0]
  const settings: Settings = { configId: c.id, configName: c.name, alertLateMinutes: c.alert_late_minutes, alertBillMinutes: c.alert_bill_minutes,
    roiHourCost: c.roi_hour_cost, roiMinutesPerOrder: c.roi_minutes_per_order, roiBaselineHoursPer100: c.roi_baseline_hours_per_100,
    roiMonthlyCost: c.roi_monthly_cost, roiStartDate: c.roi_start_date || null, tipProductId: c.tip_product_id || null }
  return { company, settings, products, categories, floors, tables, paymentMethods }
}
