import type { Ingredient } from '@/lib/domain/pantry'
import { setStock, stockLocationId } from '@/lib/services/inventory'
import { callKw } from '@/lib/services/odoo'
import { createDish, createIngredient, ensureIngredientCategories, ensureUnits, listDishes, listIngredients, requestIngredient } from '@/lib/services/pantry'

jest.mock('@/lib/services/odoo', () => ({ callKw: jest.fn() }))
jest.mock('@/lib/services/inventory', () => ({ setStock: jest.fn(), stockLocationId: jest.fn(async () => 5) }))
const m = callKw as jest.Mock
beforeEach(() => { m.mockReset(); (setStock as jest.Mock).mockReset() })

const UNITS = [{ id: 15, name: 'g', factor: 1 }, { id: 16, name: 'kg', factor: 1000 }]

// Falla si la receta no se lee del kit (mrp.bom phantom) por ración, o si el factor de la unidad se pierde.
it('lists dishes with their kit recipe scaled per serving', async () => {
  m.mockResolvedValueOnce([{ id: 2, name: 'Hamburguesa', list_price: 32000, pos_categ_ids: [1], available_in_pos: true, image_128: 'x' }, { id: 4, name: 'Papas', list_price: 8900, pos_categ_ids: [1], available_in_pos: true, image_128: false }])
    .mockResolvedValueOnce([{ id: 9, product_tmpl_id: [2, 'Hamburguesa'], product_qty: 2 }])
    .mockResolvedValueOnce([{ id: 31, bom_id: [9, 'x'], product_id: [40, 'Carne'], product_tmpl_id: [30, 'Carne'], product_qty: 300, product_uom_id: [15, 'g'] }])
  const [burger, fries] = await listDishes(UNITS)
  expect(m.mock.calls[1][2][0]).toEqual([['type', '=', 'phantom'], ['product_tmpl_id', 'in', [2, 4]]])
  expect(burger.recipe).toEqual([{ lineId: 31, ingredientId: 30, productId: 40, name: 'Carne', qty: 150, uomId: 15, uomName: 'g', uomFactor: 1 }])
  expect(fries.recipe).toBeNull()
  expect(fries.hasImage).toBe(false)
})

// Falla si el ingrediente pierde su proveedor (supplierinfo) o sus umbrales (orderpoint) al leerse.
it('lists ingredients with supplier and orderpoint thresholds', async () => {
  m.mockResolvedValueOnce([{ id: 30, name: 'Carne', categ_id: [8, 'Ingredientes / Carnes y aves'], qty_available: 10, uom_id: [16, 'kg'], image_128: false, product_variant_id: [40, 'Carne'] }])
    .mockResolvedValueOnce([{ product_tmpl_id: [30, 'Carne'], partner_id: [3, 'Carnes del Valle'], price: 28000 }])
    .mockResolvedValueOnce([{ product_id: [40, 'Carne'], product_min_qty: 3, product_max_qty: 8 }])
  const [carne] = await listIngredients(UNITS)
  expect(carne).toMatchObject({ productId: 40, categoryId: 8, categoryName: 'Carnes y aves', uomFactor: 1000, supplierId: 3, supplierName: 'Carnes del Valle', supplierPrice: 28000, thresholds: { min: 3, max: 8 } })
  expect(m.mock.calls[0][2][0]).toEqual(expect.arrayContaining([['sale_ok', '=', false], ['is_storable', '=', true]]))
})

// Falla si el plato nuevo no se crea en el POS o si su receta no se guarda como kit con sus líneas.
it('creates the dish product and its phantom bom', async () => {
  m.mockResolvedValueOnce(50).mockResolvedValueOnce([{ uom_id: [1, 'Units'] }]).mockResolvedValueOnce(70)
  await createDish({ name: 'Bowl', categoryIds: [3], description: 'Con salmón', price: 42900, lines: [{ productId: 40, qty: 180, uomId: 15 }] })
  expect(m.mock.calls[0].slice(0, 3)).toEqual(['product.template', 'create', [{ name: 'Bowl', list_price: 42900, pos_categ_ids: [[6, 0, [3]]], description_sale: 'Con salmón', available_in_pos: true, sale_ok: true, type: 'consu' }]])
  expect(m.mock.calls[2].slice(0, 3)).toEqual(['mrp.bom', 'create', [{ product_tmpl_id: 50, type: 'phantom', product_qty: 1, product_uom_id: 1, bom_line_ids: [[0, 0, { product_id: 40, product_qty: 180, product_uom_id: 15 }]] }]])
})

// Falla si el ingrediente se crea vendible o sin control de existencias, o si el stock inicial no se ajusta en el quant.
it('creates a storable, non-sellable ingredient and adjusts its initial stock', async () => {
  m.mockResolvedValueOnce(60).mockResolvedValueOnce([{ product_variant_id: [61, 'Tomate'] }])
  await createIngredient({ name: 'Tomate', categoryId: 8, uomId: 16, stock: 4.2, supplierId: 3 })
  expect(m.mock.calls[0][2][0]).toMatchObject({ name: 'Tomate', categ_id: 8, uom_id: 16, is_storable: true, sale_ok: false, available_in_pos: false, seller_ids: [[0, 0, { partner_id: 3, min_qty: 0, price: 0 }]] })
  expect(setStock).toHaveBeenCalledWith(61, 5, 4.2)
  expect(stockLocationId).toHaveBeenCalled()
})

// Falla si la solicitud no crea un purchase.order en borrador al proveedor con la línea del ingrediente.
it('requests an ingredient as a draft purchase order to its supplier', async () => {
  const i: Ingredient = { id: 30, productId: 40, name: 'Carne', categoryId: 8, categoryName: 'Carnes', qty: 1, uomId: 16, uomName: 'kg', uomFactor: 1000, hasImage: false, supplierId: 3, supplierName: 'Valle', supplierPrice: 28000, thresholds: { min: 3, max: 8 } }
  m.mockResolvedValueOnce(90)
  await expect(requestIngredient(i, 7)).resolves.toBe(90)
  expect(m.mock.calls[0].slice(0, 3)).toEqual(['purchase.order', 'create', [{ partner_id: 3, origin: 'Waiter · Inventario', order_line: [[0, 0, { product_id: 40, name: 'Carne', product_qty: 7, product_uom_id: 16, price_unit: 28000 }]] }]])
  await expect(requestIngredient({ ...i, supplierId: null }, 1)).rejects.toThrow('no-supplier')
})

// Falla si las categorías o unidades del kit se duplican al volver a llamar (deben ser idempotentes).
it('creates only the missing kit categories and units', async () => {
  m.mockResolvedValueOnce([{ id: 9 }]).mockResolvedValueOnce([{ id: 10, name: 'Frutas y verduras' }, { id: 11, name: 'Carnes y aves' }, { id: 12, name: 'Pescados y mariscos' }, { id: 13, name: 'Lácteos y huevos' }]).mockResolvedValueOnce(14)
  const cats = await ensureIngredientCategories()
  expect(m.mock.calls[2].slice(0, 3)).toEqual(['product.category', 'create', [{ name: 'Secos y granos', parent_id: 9 }]])
  expect(cats).toHaveLength(5)
  m.mockReset()
  m.mockResolvedValueOnce([...UNITS, { id: 1, name: 'Units', factor: 1 }, { id: 21, name: 'Manojo', factor: 1 }, { id: 22, name: 'Diente', factor: 1 }]).mockResolvedValueOnce(23)
  const units = await ensureUnits()
  expect(m.mock.calls[1].slice(0, 3)).toEqual(['uom.uom', 'create', [{ name: 'Rebanada', relative_factor: 1 }]])
  expect(units.map((u) => u.name)).toContain('Rebanada')
})
