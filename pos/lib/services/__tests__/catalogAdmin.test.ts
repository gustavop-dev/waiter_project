import { listProducts, saveProduct } from '@/lib/services/catalogAdmin'
import { callKw } from '@/lib/services/odoo'

jest.mock('@/lib/services/odoo', () => ({ callKw: jest.fn() }))
const m = callKw as jest.Mock
const input = { name: 'Lomo', price: 38900, categoryIds: [2], taxIds: [55], available: true, storable: false, favorite: true, description: '' }

// Falla si el alta manda las categorías o impuestos sin el comando [6,0,ids] que Odoo exige en many2many.
it('creates a product with many2many commands and returns its id', async () => {
  m.mockResolvedValueOnce(9)
  await expect(saveProduct(null, input)).resolves.toBe(9)
  const values = m.mock.calls[0][2][0]
  expect(values.pos_categ_ids).toEqual([[6, 0, [2]]])
  expect(values.description_sale).toBe(false)
})

// Falla si la lista pierde el "agotado por stock" o la descripción vacía llega como false al formulario.
it('maps templates to admin products', async () => {
  m.mockResolvedValueOnce([{ id: 3, name: 'Angus', list_price: 36900, pos_categ_ids: [2], taxes_id: [55], available_in_pos: true, is_storable: true, is_favorite: false, description_sale: false }])
  const [p] = await listProducts()
  expect(p).toEqual({ id: 3, name: 'Angus', price: 36900, categoryIds: [2], taxIds: [55], available: true, storable: true, favorite: false, description: '' })
})
