import { callKw } from '@/lib/services/odoo'
import type { Catalog, Category, Floor, PaymentMethod, Product, Table } from '@/lib/types'

// Formas REALES de load_data (capturadas contra Odoo 19, no supuestas): los many2one llegan
// como enteros pelados, y precio/categorías/impuestos viven en product.template.
interface RawProduct { id: number; product_tmpl_id: number; display_name: string; lst_price: number }
interface RawTemplate { id: number; name: string; list_price: number; pos_categ_ids: number[]; taxes_id: number[]; available_in_pos: boolean; active: boolean }
interface RawCategory { id: number; name: string; sequence: number }
interface RawFloor { id: number; name: string; table_ids: number[] }
interface RawTable { id: number; table_number: number; floor_id: number; seats: number; active: boolean }
interface RawMethod { id: number; name: string; type: PaymentMethod['type'] }
interface RawLoad {
  'product.product': RawProduct[]; 'product.template': RawTemplate[]; 'pos.category': RawCategory[]
  'restaurant.floor': RawFloor[]; 'restaurant.table': RawTable[]; 'pos.payment.method': RawMethod[]
}

export async function loadPosData(sessionId: number): Promise<Catalog> {
  // Todos los modelos, como lo hace el propio cliente de Odoo: los cargadores se leen entre sí
  // desde data[...] y una lista parcial rompe con KeyError en cada actualización.
  const raw = await callKw<RawLoad>('pos.session', 'load_data', [[sessionId], []])

  const templates = new Map(raw['product.template'].filter((t) => t.available_in_pos && t.active).map((t) => [t.id, t]))
  const products: Product[] = raw['product.product'].flatMap((p) => {
    const t = templates.get(p.product_tmpl_id)
    return t ? [{ id: p.id, templateId: t.id, name: t.name, price: t.list_price, categoryIds: t.pos_categ_ids, taxIds: t.taxes_id }] : []
  })
  const categories: Category[] = raw['pos.category'].map(({ id, name, sequence }) => ({ id, name, sequence }))
  const floors: Floor[] = raw['restaurant.floor'].map(({ id, name, table_ids }) => ({ id, name, tableIds: table_ids }))
  const tables: Table[] = raw['restaurant.table'].filter((t) => t.active)
    .map((t) => ({ id: t.id, number: t.table_number, floorId: t.floor_id, seats: t.seats }))
  const paymentMethods: PaymentMethod[] = raw['pos.payment.method'].map(({ id, name, type }) => ({ id, name, type }))
  return { products, categories, floors, tables, paymentMethods }
}
