import { callKw } from '@/lib/services/odoo'
import { loadPosData } from '@/lib/services/posData'

jest.mock('@/lib/services/odoo', () => ({ callKw: jest.fn() }))
const mockCallKw = callKw as jest.Mock

// Fixture copiado de la respuesta real de load_data (Odoo 19): many2one como enteros, impuestos y
// categorías en product.template, y una plantilla "Tips" que no está disponible en el POS.
const RAW = {
  'product.product': [
    { id: 3, product_tmpl_id: 3, display_name: 'Hamburguesa Angus', lst_price: 36900 },
    { id: 9, product_tmpl_id: 9, display_name: 'Tips', lst_price: 1 },
  ],
  'product.template': [
    { id: 3, name: 'Hamburguesa Angus', list_price: 36900, pos_categ_ids: [1], taxes_id: [55], available_in_pos: true, active: true },
    { id: 9, name: 'Tips', list_price: 1, pos_categ_ids: [], taxes_id: [], available_in_pos: false, active: true },
  ],
  'pos.category': [{ id: 1, name: 'Hamburguesas', sequence: 0 }],
  'restaurant.floor': [{ id: 2, name: 'Terraza', table_ids: [6] }],
  'restaurant.table': [{ id: 6, table_number: 5, floor_id: 2, seats: 4, active: true }],
  'pos.payment.method': [{ id: 2, name: 'Tarjeta', type: 'bank' }, { id: 1, name: 'Efectivo', type: 'cash' }],
}

beforeEach(() => mockCallKw.mockResolvedValue(RAW))

// Falla si el producto deja de tomar impuestos y categorías de su plantilla: el pedido llega a Odoo con tax_ids null.
it('joins each product to its template for price, categories and taxes', async () => {
  const c = await loadPosData(1)
  expect(c.products[0]).toEqual({ id: 3, templateId: 3, name: 'Hamburguesa Angus', price: 36900, categoryIds: [1], taxIds: [55] })
})

// Falla si un producto no disponible en el POS (Tips) se cuela en la carta.
it('drops products whose template is not available in the POS', async () => {
  const c = await loadPosData(1)
  expect(c.products.map((p) => p.name)).toEqual(['Hamburguesa Angus'])
})

// Falla si floor_id se lee como par [id, nombre]: llega como entero y el filtro por piso quedaría vacío.
it('reads the table floor as a bare id and keeps the cash method', async () => {
  const c = await loadPosData(1)
  expect(c.tables[0]).toEqual({ id: 6, number: 5, floorId: 2, seats: 4 })
  expect(c.paymentMethods.find((m) => m.type === 'cash')?.name).toBe('Efectivo')
})

// Falla si se vuelve a pedir una lista parcial de modelos: los cargadores se leen entre sí y lanzan KeyError.
it('asks load_data for every model, exactly like the Odoo client does', async () => {
  await loadPosData(9)
  expect(mockCallKw).toHaveBeenCalledWith('pos.session', 'load_data', [[9], []])
})
