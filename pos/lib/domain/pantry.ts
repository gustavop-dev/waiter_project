// Reglas puras del inventario del kit (12 – Inventory): niveles de stock, raciones servibles, estados y filtros.
// Los datos vienen de los módulos estándar de Odoo (product, stock, mrp, purchase, uom); aquí no hay llamadas.

export type StockLevel = 'empty' | 'low' | 'medium' | 'high'
export type IngredientStatus = 'request' | 'normal' | 'good'
export type DishStatusFilter = 'all' | 'available' | 'unavailable'
export type LevelFilter = 'all' | StockLevel

export interface Thresholds { min: number; max: number }
// Sin punto de pedido en Odoo: Bajo ≤ 5, Medio ≤ 20, Alto > 20 (y Vacío en 0).
export const DEFAULT_THRESHOLDS: Thresholds = { min: 5, max: 20 }

export interface RecipeLine { lineId: number; ingredientId: number; productId: number; name: string; qty: number; uomId: number; uomName: string; uomFactor: number }
export interface Dish { id: number; name: string; categoryIds: number[]; availableInPos: boolean; hasImage: boolean; price: number; recipe: RecipeLine[] | null }
export interface DishView extends Dish { servings: number | null; level: StockLevel | null; available: boolean }
export interface Ingredient {
  id: number; productId: number; name: string; categoryId: number | null; categoryName: string; qty: number; uomId: number; uomName: string; uomFactor: number
  hasImage: boolean; supplierId: number | null; supplierName: string | null; supplierPrice: number; thresholds: Thresholds | null
}

export const STOCK_LEVELS: StockLevel[] = ['empty', 'low', 'medium', 'high']

export function stockLevel(qty: number, thresholds: Thresholds | null = null): StockLevel {
  const t = thresholds ?? DEFAULT_THRESHOLDS
  if (qty <= 0) return 'empty'
  if (qty <= t.min) return 'low'
  return qty <= t.max ? 'medium' : 'high'
}

export function ingredientStatus(level: StockLevel): IngredientStatus {
  return level === 'high' ? 'good' : level === 'medium' ? 'normal' : 'request'
}

// Raciones servibles: el mínimo entero de stock disponible / cantidad de la receta. Sin líneas útiles no hay receta.
export function servings(lines: { available: number; needed: number }[]): number | null {
  const ratios = lines.filter((l) => l.needed > 0).map((l) => Math.floor(l.available / l.needed))
  return ratios.length === 0 ? null : Math.max(0, Math.min(...ratios))
}

export const servingsLevel = (n: number | null): StockLevel | null => (n === null ? null : stockLevel(n))

// Un plato se puede pedir si está en el POS y su receta (cuando la tiene) no se agotó.
export const dishAvailable = (availableInPos: boolean, portions: number | null): boolean => availableInPos && portions !== 0

// Odoo 19 convierte entre unidades por su factor absoluto: qty × factor origen / factor destino (kg = 1000, g = 1).
export const convertQty = (qty: number, fromFactor: number, toFactor: number): number => (qty * fromFactor) / toFactor

export function dishView(d: Dish, byIngredient: Map<number, Ingredient>): DishView {
  const lines = (d.recipe ?? []).flatMap((l) => {
    const ing = byIngredient.get(l.ingredientId)
    return ing ? [{ available: ing.qty, needed: convertQty(l.qty, l.uomFactor, ing.uomFactor) }] : []
  })
  const portions = d.recipe === null ? null : servings(lines)
  return { ...d, servings: portions, level: servingsLevel(portions), available: dishAvailable(d.availableInPos, portions) }
}

const qtyFormat = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 2 })
export const formatQty = (qty: number): string => qtyFormat.format(qty)
export const formatStock = (qty: number, uomName: string): string => `${formatQty(qty)} ${unitDisplayName(uomName)}`

// Solicitud al proveedor: lo que falta hasta el máximo del punto de pedido; sin umbrales, una unidad.
export function requestQty(qty: number, thresholds: Thresholds | null): number {
  if (thresholds && thresholds.max > qty) return Math.round((thresholds.max - qty) * 100) / 100
  return 1
}

// Unidades del kit (Add New Ingredients) → nombre de la unidad en uom.uom. Las tres primeras no vienen con Odoo y se crean.
export const KIT_UNITS = [
  { key: 'bunch', uom: 'Manojo', label: 'Manojo' }, { key: 'clove', uom: 'Diente', label: 'Diente' }, { key: 'gram', uom: 'g', label: 'g' },
  { key: 'kilogram', uom: 'kg', label: 'kg' }, { key: 'pieces', uom: 'Units', label: 'Unidades' }, { key: 'slice', uom: 'Rebanada', label: 'Rebanada' },
] as const
export type KitUnitKey = (typeof KIT_UNITS)[number]['key']
export const kitUnitKey = (uomName: string): KitUnitKey | null => KIT_UNITS.find((u) => u.uom === uomName)?.key ?? null
export const unitDisplayName = (uomName: string): string => KIT_UNITS.find((u) => u.uom === uomName)?.label ?? uomName

// Categorías de ingrediente del kit como hijas de product.category "Ingredientes"; el emoji es el del kit.
export const INGREDIENT_ROOT = 'Ingredientes'
export const INGREDIENT_CATEGORIES = [
  { key: 'produce', name: 'Frutas y verduras', emoji: '🥦' }, { key: 'meat', name: 'Carnes y aves', emoji: '🥩' },
  { key: 'seafood', name: 'Pescados y mariscos', emoji: '🐟' }, { key: 'dairy', name: 'Lácteos y huevos', emoji: '🧀' },
  { key: 'dry', name: 'Secos y granos', emoji: '🍚' },
] as const
export const categoryEmoji = (name: string): string => INGREDIENT_CATEGORIES.find((c) => c.name === name)?.emoji ?? '🧺'

const matches = (name: string, query: string) => name.toLocaleLowerCase('es').includes(query.trim().toLocaleLowerCase('es'))

export interface DishFilters { status: DishStatusFilter; level: LevelFilter; categoryId: number | null; query: string }
export const EMPTY_DISH_FILTERS: DishFilters = { status: 'all', level: 'all', categoryId: null, query: '' }

export function filterDishes(rows: DishView[], f: DishFilters): DishView[] {
  return rows.filter((d) =>
    (f.status === 'all' || (f.status === 'available') === d.available)
    && (f.level === 'all' || d.level === f.level)
    && (f.categoryId === null || d.categoryIds.includes(f.categoryId))
    && matches(d.name, f.query))
}

export interface IngredientFilters { level: LevelFilter; categoryId: number | null; query: string }
export const EMPTY_INGREDIENT_FILTERS: IngredientFilters = { level: 'all', categoryId: null, query: '' }

export const ingredientLevel = (i: Ingredient): StockLevel => stockLevel(i.qty, i.thresholds)

export function filterIngredients(rows: Ingredient[], f: IngredientFilters): Ingredient[] {
  return rows.filter((i) => (f.level === 'all' || ingredientLevel(i) === f.level) && (f.categoryId === null || i.categoryId === f.categoryId) && matches(i.name, f.query))
}

export const countBy = <T>(rows: T[], pick: (row: T) => boolean): number => rows.filter(pick).length
