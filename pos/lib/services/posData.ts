import { callKw } from '@/lib/services/odoo'
import type { Catalog, Category, Floor, PaymentMethod, Product, Table } from '@/lib/types'


interface RawProduct { id: number; product_tmpl_id: [number, string]; display_name: string; lst_price: number; pos_categ_ids: number[]; taxes_id: number[] }
interface RawCategory { id: number; name: string; sequence: number }
interface RawFloor { id: number; name: string; table_ids: number[] }
interface RawTable { id: number; table_number: number; floor_id: [number, string]; seats: number }
interface RawMethod { id: number; name: string; type: PaymentMethod['type'] }
interface RawLoad {
  'product.product': RawProduct[]; 'pos.category': RawCategory[]; 'restaurant.floor': RawFloor[]
  'restaurant.table': RawTable[]; 'pos.payment.method': RawMethod[]
}

export async function loadPosData(sessionId: number): Promise<Catalog> {
  // Todos los modelos, como lo hace el propio cliente de Odoo: los cargadores se leen entre sí
  // desde data[...] y una lista parcial rompe con KeyError en cada actualización.
  const raw = await callKw<RawLoad>('pos.session', 'load_data', [[sessionId], []])
  const products: Product[] = raw['product.product'].map((p) => ({
    id: p.id, templateId: p.product_tmpl_id[0], name: p.display_name, price: p.lst_price,
    categoryIds: p.pos_categ_ids, taxIds: p.taxes_id,
  }))
  const categories: Category[] = raw['pos.category'].map(({ id, name, sequence }) => ({ id, name, sequence }))
  const floors: Floor[] = raw['restaurant.floor'].map(({ id, name, table_ids }) => ({ id, name, tableIds: table_ids }))
  const tables: Table[] = raw['restaurant.table'].map((t) => ({ id: t.id, number: t.table_number, floorId: t.floor_id[0], seats: t.seats }))
  const paymentMethods: PaymentMethod[] = raw['pos.payment.method'].map(({ id, name, type }) => ({ id, name, type }))
  return { products, categories, floors, tables, paymentMethods }
}
