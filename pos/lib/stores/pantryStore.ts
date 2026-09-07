'use client'

import { create } from 'zustand'

import { EMPTY_DISH_FILTERS, EMPTY_INGREDIENT_FILTERS, type Dish, type DishFilters, type Ingredient, type IngredientFilters } from '@/lib/domain/pantry'
import { listCategories, type AdminCategory } from '@/lib/services/catalogAdmin'
import { ensureIngredientCategories, ensureUnits, listDishes, listIngredients, listRequests, listSuppliers, type IngredientCategory, type PurchaseRequest, type Supplier, type Unit } from '@/lib/services/pantry'

export type PantryTab = 'menu' | 'ingredients' | 'requests'

interface PantryState {
  tab: PantryTab; loading: boolean; error: string | null
  dishes: Dish[]; ingredients: Ingredient[]; requests: PurchaseRequest[]
  units: Unit[]; posCategories: AdminCategory[]; ingredientCategories: IngredientCategory[]; suppliers: Supplier[]
  dishFilters: DishFilters; ingredientFilters: IngredientFilters; requestQuery: string
  setTab: (tab: PantryTab) => void
  setDishFilters: (patch: Partial<DishFilters>) => void
  setIngredientFilters: (patch: Partial<IngredientFilters>) => void
  setRequestQuery: (query: string) => void
  resetFilters: () => void
  load: () => Promise<void>
  refresh: () => Promise<void>
}

// Pestaña Inventario del kit: una carga trae catálogos (unidades, categorías, proveedores) y las tres listas;
// los filtros viven aquí para que las pestañas no los pierdan al cambiar.
export const usePantryStore = create<PantryState>((set, get) => ({
  tab: 'menu', loading: false, error: null,
  dishes: [], ingredients: [], requests: [], units: [], posCategories: [], ingredientCategories: [], suppliers: [],
  dishFilters: EMPTY_DISH_FILTERS, ingredientFilters: EMPTY_INGREDIENT_FILTERS, requestQuery: '',
  setTab: (tab) => set({ tab }),
  setDishFilters: (patch) => set((s) => ({ dishFilters: { ...s.dishFilters, ...patch } })),
  setIngredientFilters: (patch) => set((s) => ({ ingredientFilters: { ...s.ingredientFilters, ...patch } })),
  setRequestQuery: (requestQuery) => set({ requestQuery }),
  resetFilters: () => set((s) => ({ dishFilters: { ...EMPTY_DISH_FILTERS, query: s.dishFilters.query }, ingredientFilters: { ...EMPTY_INGREDIENT_FILTERS, query: s.ingredientFilters.query } })),
  load: async () => {
    set({ loading: true, error: null })
    try {
      const [units, posCategories, ingredientCategories, suppliers] = await Promise.all([ensureUnits(), listCategories(), ensureIngredientCategories(), listSuppliers()])
      const [dishes, ingredients, requests] = await Promise.all([listDishes(units), listIngredients(units), listRequests()])
      set({ units, posCategories, ingredientCategories, suppliers, dishes, ingredients, requests, loading: false })
    } catch (e) {
      set({ loading: false, error: e instanceof Error ? e.message : String(e) })
    }
  },
  refresh: async () => {
    const units = get().units
    const [dishes, ingredients, requests] = await Promise.all([listDishes(units), listIngredients(units), listRequests()])
    set({ dishes, ingredients, requests })
  },
}))
