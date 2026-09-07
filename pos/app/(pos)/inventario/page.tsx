'use client'

import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useState } from 'react'

import { KitEmptyState } from '@/components/kit/KitEmptyState'
import { KitShell } from '@/components/kit/KitShell'
import { Modal } from '@/components/kit/Modal'
import { AddDishWizard } from '@/components/pantry/AddDishWizard'
import { AddIngredientWizard } from '@/components/pantry/AddIngredientWizard'
import { DishCard } from '@/components/pantry/DishCard'
import { DishDetailModal } from '@/components/pantry/DishDetailModal'
import { FilterPanel, type FilterSection } from '@/components/pantry/FilterPanel'
import { IngredientRow } from '@/components/pantry/IngredientRow'
import { PantryHeader } from '@/components/pantry/PantryHeader'
import { RequestList } from '@/components/pantry/RequestList'
import { Button } from '@/components/ui/Button'
import {
  PANTRY_CATEGORIES, STOCK_LEVELS, dishAvailable, filterDishes, filterIngredients, groupCounts,
  type Dish, type Ingredient, type LevelFilter, type PantryCategory, type RecipeLine,
} from '@/lib/domain/pantry'
import { archiveIngredient, recipeLines, requestIngredient } from '@/lib/services/pantry'
import { usePantryStore } from '@/lib/stores/pantryStore'
import { toast } from '@/lib/stores/toastStore'

type IngredientModal = { kind: 'add' } | { kind: 'edit'; ingredient: Ingredient } | { kind: 'delete'; ingredient: Ingredient } | null

// 12 – Inventory del kit: pestañas Menú · Ingredientes · Solicitudes sobre el addon projectapp_pantry de Odoo.
export default function InventarioPage() {
  const t = useTranslations('pantry')
  const s = usePantryStore()
  const [detail, setDetail] = useState<Dish | null>(null)
  const [recipe, setRecipe] = useState<RecipeLine[]>([])
  const [recipeLoading, setRecipeLoading] = useState(false)
  const [addDish, setAddDish] = useState(false)
  const [ingredientModal, setIngredientModal] = useState<IngredientModal>(null)
  const load = s.load
  useEffect(() => { void load() }, [load])

  // La receta se pide al abrir el detalle: `recipe_lines()` trae la cantidad por ración y el nivel de cada ingrediente.
  const openDetail = useCallback(async (dish: Dish) => {
    setDetail(dish); setRecipe([]); setRecipeLoading(true)
    try { setRecipe(await recipeLines(dish.id)) } catch { setRecipe([]) } finally { setRecipeLoading(false) }
  }, [])

  const posCategoryName = (ids: number[]) => s.posCategories.find((c) => c.id === ids[0])?.name ?? '—'
  const dishes = filterDishes(s.dishes, s.dishFilters)
  const ingredients = filterIngredients(s.ingredients, s.ingredientFilters)

  const levelSection = <T extends { level: string | null }>(rows: T[], active: LevelFilter, pick: (l: LevelFilter) => void): FilterSection => {
    const counts = groupCounts(rows, STOCK_LEVELS, (r) => r.level)
    return { title: t('filters.stockLevel'), options: [
      { key: 'all', label: t('filters.all'), count: counts.all, active: active === 'all', onClick: () => pick('all') },
      ...STOCK_LEVELS.map((l) => ({ key: l, label: t(`levels.${l}`), count: counts[l], active: active === l, onClick: () => pick(l) })),
    ] }
  }

  const dishStatus = groupCounts(s.dishes, ['available', 'unavailable'], (d) => (dishAvailable(d) ? 'available' : 'unavailable'))
  const dishCategories = groupCounts(s.dishes, s.posCategories.map((c) => String(c.id)), () => null)
  for (const c of s.posCategories) dishCategories[String(c.id)] = s.dishes.filter((d) => d.categoryIds.includes(c.id)).length
  const menuSections: FilterSection[] = [
    { title: t('filters.dishStatus'), options: [
      { key: 'all', label: t('filters.all'), count: dishStatus.all, active: s.dishFilters.status === 'all', onClick: () => s.setDishFilters({ status: 'all' }) },
      { key: 'available', label: t('filters.available'), count: dishStatus.available, active: s.dishFilters.status === 'available', onClick: () => s.setDishFilters({ status: 'available' }) },
      { key: 'unavailable', label: t('filters.unavailable'), count: dishStatus.unavailable, active: s.dishFilters.status === 'unavailable', onClick: () => s.setDishFilters({ status: 'unavailable' }) },
    ] },
    levelSection(s.dishes, s.dishFilters.level, (level) => s.setDishFilters({ level })),
    { title: t('filters.category'), options: [
      { key: 'all', label: t('filters.all'), count: dishCategories.all, active: s.dishFilters.categoryId === null, onClick: () => s.setDishFilters({ categoryId: null }) },
      ...s.posCategories.map((c) => ({ key: String(c.id), label: c.name, count: dishCategories[String(c.id)], active: s.dishFilters.categoryId === c.id, onClick: () => s.setDishFilters({ categoryId: c.id }) })),
    ] },
  ]
  const ingredientCounts = groupCounts(s.ingredients, PANTRY_CATEGORIES.map((c) => c.key), (i) => i.category)
  const ingredientSections: FilterSection[] = [
    levelSection(s.ingredients, s.ingredientFilters.level, (level) => s.setIngredientFilters({ level })),
    { title: t('filters.category'), columns: 1, options: [
      { key: 'all', label: t('filters.all'), count: ingredientCounts.all, active: s.ingredientFilters.category === null, onClick: () => s.setIngredientFilters({ category: null }) },
      ...PANTRY_CATEGORIES.map((c) => ({ key: c.key, label: `${c.emoji} ${t(`categories.${c.key}`)}`, count: ingredientCounts[c.key], active: s.ingredientFilters.category === c.key, onClick: () => s.setIngredientFilters({ category: c.key as PantryCategory }) })),
    ] },
  ]

  // "Request Ingredients": el addon crea la orden de compra al proveedor; sin proveedor devuelve su propio aviso.
  async function request(i: Ingredient) {
    try {
      await requestIngredient(i.id)
      toast({ title: t('request.successTitle'), body: t('request.successBody') })
      await s.refresh()
    } catch (e) { toast({ title: t('error'), body: e instanceof Error ? e.message : String(e), tone: 'danger' }) }
  }
  async function remove(i: Ingredient) {
    setIngredientModal(null)
    try {
      await archiveIngredient(i.id)
      toast({ title: t('request.deletedTitle'), body: t('request.deletedBody', { name: i.name }) })
      await s.refresh()
    } catch (e) { toast({ title: t('error'), body: e instanceof Error ? e.message : String(e), tone: 'danger' }) }
  }

  const header = s.tab === 'menu'
    ? { query: s.dishFilters.query, onQuery: (query: string) => s.setDishFilters({ query }), placeholder: t('search.dish'), action: t('actions.addDish'), onAction: () => setAddDish(true) }
    : s.tab === 'ingredients'
      ? { query: s.ingredientFilters.query, onQuery: (query: string) => s.setIngredientFilters({ query }), placeholder: t('search.ingredient'), action: t('actions.addIngredient'), onAction: () => setIngredientModal({ kind: 'add' }) }
      : { query: s.requestQuery, onQuery: s.setRequestQuery, placeholder: t('search.request'), action: undefined, onAction: undefined }
  const listTitle = t(s.tab === 'menu' ? 'menu.listTitle' : s.tab === 'ingredients' ? 'ingredients.listTitle' : 'requests.listTitle')

  return (
    <KitShell>
      <PantryHeader tab={s.tab} onTab={s.setTab} query={header.query} onQuery={header.onQuery} searchPlaceholder={header.placeholder} action={header.action} onAction={header.onAction} />
      <div className="flex-1 min-h-0 px-4 pb-4 flex gap-4">
        {s.tab === 'menu' && <FilterPanel sections={menuSections} onReset={s.resetFilters} />}
        {s.tab === 'ingredients' && <FilterPanel sections={ingredientSections} onReset={s.resetFilters} />}
        <section aria-label={listTitle} className="flex-1 min-w-0 min-h-0 bg-surface border border-border rounded-lg flex flex-col">
          <header className="h-14 px-4 flex items-center border-b border-border shrink-0"><h2 className="text-[16px] font-semibold text-ink">{listTitle}</h2></header>
          <div className="flex-1 min-h-0 overflow-auto flex flex-col">
            {s.error && <p role="alert" className="m-4 p-3 rounded-md bg-danger-soft text-danger-ink text-[14px]">{s.error}</p>}
            {s.tab === 'menu' && (dishes.length === 0 && !s.loading
              ? <KitEmptyState icon="inventory" title={t('menu.empty')} body={t('menu.emptyBody')} />
              : <div className="p-2.5 grid grid-cols-3 gap-2.5 content-start">{dishes.map((d) => <DishCard key={d.id} dish={d} category={posCategoryName(d.categoryIds)} onOpen={() => void openDetail(d)} />)}</div>)}
            {s.tab === 'ingredients' && (ingredients.length === 0 && !s.loading
              ? <KitEmptyState icon="inventory" title={t('ingredients.empty')} body={t('ingredients.emptyBody')} />
              : <ul className="p-2.5 flex flex-col gap-2">{ingredients.map((i) => <IngredientRow key={i.id} ingredient={i} onEdit={() => setIngredientModal({ kind: 'edit', ingredient: i })} onRequest={() => void request(i)} onDelete={() => setIngredientModal({ kind: 'delete', ingredient: i })} />)}</ul>)}
            {s.tab === 'requests' && <RequestList requests={s.requests} query={s.requestQuery} />}
          </div>
        </section>
      </div>
      <DishDetailModal dish={detail} category={detail ? posCategoryName(detail.categoryIds) : ''} lines={recipe} loading={recipeLoading} onClose={() => setDetail(null)} />
      <AddDishWizard open={addDish} onClose={() => setAddDish(false)} categories={s.posCategories} ingredients={s.ingredients} units={s.units} onSaved={s.refresh} />
      {(ingredientModal?.kind === 'add' || ingredientModal?.kind === 'edit') && (
        <AddIngredientWizard open onClose={() => setIngredientModal(null)} initial={ingredientModal.kind === 'edit' ? ingredientModal.ingredient : null}
          units={s.units} suppliers={s.suppliers} onSaved={s.refresh} />
      )}
      <Modal open={ingredientModal?.kind === 'delete'} onClose={() => setIngredientModal(null)} footer={
        <div className="flex gap-3 justify-end">
          <Button variant="secondary" onClick={() => setIngredientModal(null)}>{t('request.deleteNo')}</Button>
          <Button variant="destructive" onClick={() => ingredientModal?.kind === 'delete' && void remove(ingredientModal.ingredient)}>{t('request.deleteYes')}</Button>
        </div>}>
        <div className="p-6 flex flex-col gap-2">
          <p className="text-[20px] font-semibold text-ink">{t('request.deleteTitle')}</p>
          <p className="text-soft">{ingredientModal?.kind === 'delete' ? t('request.deleteBody', { name: ingredientModal.ingredient.name }) : ''}</p>
        </div>
      </Modal>
    </KitShell>
  )
}
