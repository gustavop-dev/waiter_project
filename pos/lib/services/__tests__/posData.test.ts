import { callKw } from '@/lib/services/odoo'
import { loadPosData } from '@/lib/services/posData'

jest.mock('@/lib/services/odoo', () => ({ callKw: jest.fn() }))
const mockCallKw = callKw as jest.Mock

// Fixture copiado de la respuesta real de load_data (Odoo 19): many2one como enteros, impuestos y
// categorías en product.template, una plantilla "Tips" no disponible y una cerveza almacenable.
const RAW = {
  'product.product': [
    { id: 3, product_tmpl_id: 3, display_name: 'Hamburguesa Angus', lst_price: 36900 },
    { id: 6, product_tmpl_id: 6, display_name: 'Club Colombia', lst_price: 14000 },
    { id: 9, product_tmpl_id: 9, display_name: 'Tips', lst_price: 1 },
  ],
  'product.template': [
    { id: 3, name: 'Hamburguesa Angus', list_price: 36900, pos_categ_ids: [1], taxes_id: [55], available_in_pos: true, active: true, is_favorite: true, is_storable: false, image_128: false },
    { id: 6, name: 'Club Colombia', list_price: 14000, pos_categ_ids: [2], taxes_id: [55], available_in_pos: true, active: true, is_favorite: false, is_storable: true, image_128: false },
    { id: 9, name: 'Tips', list_price: 1, pos_categ_ids: [], taxes_id: [], available_in_pos: false, active: true, is_favorite: false, is_storable: false, image_128: false },
  ],
  'pos.category': [{ id: 1, name: 'Hamburguesas', sequence: 0 }],
  'restaurant.floor': [{ id: 2, name: 'Terraza', table_ids: [6] }],
  'restaurant.table': [{ id: 6, table_number: 5, floor_id: 2, seats: 4, active: true }],
  'pos.payment.method': [{ id: 2, name: 'Tarjeta', type: 'bank' }, { id: 1, name: 'Efectivo', type: 'cash' }],
  'res.company': [{ id: 1, name: 'La Provincia' }], 'pos.config': [{ id: 1, name: 'Salón', alert_late_minutes: 18, alert_bill_minutes: 10, roi_hour_cost: 20000, roi_minutes_per_order: 11, roi_baseline_hours_per_100: 18.4, roi_monthly_cost: 2740000, roi_start_date: false, tip_product_id: 1 }],
}

beforeEach(() => {
  mockCallKw.mockReset()
  mockCallKw.mockImplementation(async (_m: string, method: string) => (method === 'load_data' ? RAW : [{ id: 6, qty_available: 0 }]))
})

// Falla si el producto deja de tomar impuestos, categorías o el favorito de su plantilla.
it('joins each product to its template for price, categories, taxes and favorite', async () => {
  const c = await loadPosData(1)
  expect(c.products[0]).toMatchObject({ id: 3, name: 'Hamburguesa Angus', price: 36900, categoryIds: [1], taxIds: [55], favorite: true })
})

// Falla si un consumible sin control de stock (qty 0 siempre) sale como agotado: la carta entera quedaría gris.
it('marks sold out only storable products without stock', async () => {
  const c = await loadPosData(1)
  expect(c.products.map((p) => [p.name, p.soldOut])).toEqual([['Hamburguesa Angus', false], ['Club Colombia', true]])
  expect(mockCallKw.mock.calls.filter((k) => k[1] === 'search_read')[0][2][0]).toEqual([['id', 'in', [6]]])
})

// Falla si el nombre del restaurante no llega a la barra lateral ("LA PROVINCIA" en el diseño).
it('reads the company name for the sidebar', async () => {
  const c = await loadPosData(1)
  expect(c.company.name).toBe('La Provincia')
})

// Falla si floor_id se lee como par [id, nombre]: llega como entero y el filtro por piso quedaría vacío.
it('reads the table floor as a bare id and keeps the cash method', async () => {
  const c = await loadPosData(1)
  expect(c.tables[0]).toEqual({ id: 6, number: 5, floorId: 2, seats: 4 })
  expect(c.paymentMethods.find((m) => m.type === 'cash')?.name).toBe('Efectivo')
})
