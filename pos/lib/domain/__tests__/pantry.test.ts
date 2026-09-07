import {
  convertQty, dishAvailable, filterDishes, filterIngredients, formatStock, ingredientStatus, kitUnitKey, requestQty,
  servings, servingsLevel, stockLevel, type DishView, type Ingredient,
} from '@/lib/domain/pantry'

const ingredient = (over: Partial<Ingredient> = {}): Ingredient => ({
  id: 1, productId: 11, name: 'Lechuga', categoryId: 5, categoryName: 'Frutas y verduras', qty: 3, uomId: 16, uomName: 'kg', uomFactor: 1000,
  hasImage: false, supplierId: null, supplierName: null, supplierPrice: 0, thresholds: null, ...over,
})
const dish = (over: Partial<DishView> = {}): DishView => ({
  id: 1, name: 'Hamburguesa', categoryIds: [1], availableInPos: true, hasImage: true, price: 100, recipe: [], servings: 3, level: 'low', available: true, ...over,
})

// Falla si los umbrales por defecto (Bajo ≤ 5, Medio ≤ 20, Alto > 20) o el vacío en 0 dejan de graduar el nivel.
it('grades stock level with the default thresholds', () => {
  expect([stockLevel(0), stockLevel(5), stockLevel(20), stockLevel(21)]).toEqual(['empty', 'low', 'medium', 'high'])
})

// Falla si un punto de pedido de Odoo (mínimo y máximo) no manda sobre los umbrales por defecto.
it('grades stock level with the orderpoint thresholds when they exist', () => {
  const t = { min: 2, max: 8 }
  expect([stockLevel(2, t), stockLevel(8, t), stockLevel(8.5, t)]).toEqual(['low', 'medium', 'high'])
})

// Falla si "Solicitar" no sale en bajo y vacío, "Normal" en medio y "Bien" en alto.
it('maps a stock level to the kit status', () => {
  expect(['empty', 'low', 'medium', 'high'].map((l) => ingredientStatus(l as never))).toEqual(['request', 'request', 'normal', 'good'])
})

// Falla si las raciones no son el mínimo entero entre ingredientes, o si una receta vacía no se reporta como "sin receta".
it('computes the servings as the integer minimum across recipe lines', () => {
  expect(servings([{ available: 10, needed: 0.15 }, { available: 0.9, needed: 0.03 }, { available: 40, needed: 1 }])).toBe(30)
  expect(servings([{ available: 0.9, needed: 0.2 }])).toBe(4)
  expect(servings([])).toBeNull()
  expect(servingsLevel(null)).toBeNull()
  expect(servingsLevel(4)).toBe('low')
})

// Falla si una receta en gramos no se convierte a los kilos del ingrediente (1 kg = factor 1000, g = 1).
it('converts a recipe quantity to the ingredient unit through the uom factors', () => {
  expect(convertQty(150, 1, 1000)).toBeCloseTo(0.15)
  expect(convertQty(2, 1000, 1)).toBe(2000)
})

// Falla si un plato sin raciones sigue "Disponible", o si uno sin receta deja de estarlo.
it('marks a dish available when it is in the POS and its recipe is not exhausted', () => {
  expect([dishAvailable(true, 3), dishAvailable(true, null), dishAvailable(true, 0), dishAvailable(false, 3)]).toEqual([true, true, false, false])
})

// Falla si el stock no se muestra en español con la unidad de Odoo ("1,5 kg").
it('formats the stock with the unit', () => {
  expect(formatStock(1.5, 'kg')).toBe('1,5 kg')
  expect(formatStock(900, 'g')).toBe('900 g')
  expect(formatStock(84, 'Units')).toBe('84 Unidades')
})

// Falla si la solicitud no pide hasta el máximo del punto de pedido, o 1 unidad cuando no hay umbrales.
it('requests up to the orderpoint maximum, or one unit without thresholds', () => {
  expect(requestQty(1.5, { min: 2, max: 10 })).toBe(8.5)
  expect(requestQty(12, { min: 2, max: 10 })).toBe(1)
  expect(requestQty(3, null)).toBe(1)
})

// Falla si las unidades del kit no se reconocen por el nombre de la unidad de Odoo.
it('recognises the kit units by their Odoo name', () => {
  expect([kitUnitKey('kg'), kitUnitKey('Units'), kitUnitKey('Manojo'), kitUnitKey('L')]).toEqual(['kilogram', 'pieces', 'bunch', null])
})

// Falla si los filtros del menú (estado, nivel, categoría, búsqueda) dejan pasar un plato que no cumple.
it('filters dishes by status, level, category and query', () => {
  const rows = [dish({ id: 1, name: 'Hamburguesa', level: 'low' }), dish({ id: 2, name: 'Bowl', categoryIds: [3], level: 'high', servings: 30 }), dish({ id: 3, name: 'Tacos', available: false, servings: 0, level: 'empty' })]
  expect(filterDishes(rows, { status: 'available', level: 'all', categoryId: null, query: '' }).map((d) => d.id)).toEqual([1, 2])
  expect(filterDishes(rows, { status: 'all', level: 'high', categoryId: null, query: '' }).map((d) => d.id)).toEqual([2])
  expect(filterDishes(rows, { status: 'all', level: 'all', categoryId: 3, query: '' }).map((d) => d.id)).toEqual([2])
  expect(filterDishes(rows, { status: 'all', level: 'all', categoryId: null, query: 'ta' }).map((d) => d.id)).toEqual([3])
})

// Falla si los filtros de ingredientes (nivel, categoría, búsqueda) dejan pasar un ingrediente que no cumple.
it('filters ingredients by level, category and query', () => {
  const rows = [ingredient({ id: 1, qty: 1 }), ingredient({ id: 2, name: 'Salmón', categoryId: 7, qty: 30 })]
  expect(filterIngredients(rows, { level: 'low', categoryId: null, query: '' }).map((i) => i.id)).toEqual([1])
  expect(filterIngredients(rows, { level: 'all', categoryId: 7, query: '' }).map((i) => i.id)).toEqual([2])
  expect(filterIngredients(rows, { level: 'all', categoryId: null, query: 'salm' }).map((i) => i.id)).toEqual([2])
})
