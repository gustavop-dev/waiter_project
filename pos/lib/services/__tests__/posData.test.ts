import { callKw } from '@/lib/services/odoo'
import { loadPosData } from '@/lib/services/posData'

jest.mock('@/lib/services/odoo', () => ({ callKw: jest.fn() }))
const mockCallKw = callKw as jest.Mock

const RAW = {
  'product.product': [{ id: 3, product_tmpl_id: [2, 'Angus'], display_name: 'Hamburguesa Angus', lst_price: 36900, pos_categ_ids: [1], taxes_id: [5] }],
  'pos.category': [{ id: 1, name: 'Fuertes', sequence: 1 }],
  'restaurant.floor': [{ id: 1, name: 'Terraza', table_ids: [6] }],
  'restaurant.table': [{ id: 6, table_number: 5, floor_id: [1, 'Terraza'], seats: 4 }],
  'pos.payment.method': [{ id: 1, name: 'Efectivo', type: 'cash' }, { id: 2, name: 'Tarjeta', type: 'bank' }],
}

// Falla si se pierde el mapeo de campos de Odoo (p. ej. lst_price → price) y la carta sale sin precios.
it('maps the load_data payload into the typed catalog', async () => {
  mockCallKw.mockResolvedValue(RAW)
  const c = await loadPosData(1)
  expect(c.products[0]).toEqual({ id: 3, templateId: 2, name: 'Hamburguesa Angus', price: 36900, categoryIds: [1], taxIds: [5] })
  expect(c.tables[0]).toEqual({ id: 6, number: 5, floorId: 1, seats: 4 })
  expect(c.paymentMethods.map((m) => m.type)).toEqual(['cash', 'bank'])
})

// Falla si se vuelve a pedir una lista parcial de modelos: los cargadores de Odoo se leen
// entre sí desde data[...] y una lista incompleta lanza KeyError (product.template, pos.order...).
it('asks load_data for every model, exactly like the Odoo client does', async () => {
  mockCallKw.mockResolvedValue(RAW)
  await loadPosData(9)
  expect(mockCallKw).toHaveBeenCalledWith('pos.session', 'load_data', [[9], []])
})
