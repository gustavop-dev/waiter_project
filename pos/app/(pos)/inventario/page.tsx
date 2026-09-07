'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

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
import { categoryEmoji, countBy, dishView, filterDishes, filterIngredients, ingredientLevel, requestQty, type DishView, type Ingredient, type LevelFilter } from '@/lib/domain/pantry'
import { archiveIngredient, requestIngredient } from '@/lib/services/pantry'
import { usePantryStore } from '@/lib/stores/pantryStore'
import { toast } from '@/lib/stores/toastStore'

type IngredientModal = { kind: 'add' } | { kind: 'edit'; ingredient: Ingredient } | { kind: 'delete'; ingredient: Ingredient } | null

// 12 – Inventory del kit: pestañas Menú · Ingredientes · Solicitudes sobre product/stock/mrp/purchase de Odoo.
export default function InventarioPage() {
  const t = useTranslations('pantry')
  const s = usePantryStore()
  const [detail, setDetail] = useState<DishView | null>(null)
  const [addDish, setAddDish] = useState(false)
  const [ingredientModal, setIngredientModal] = useState<IngredientModal>(null)
  useEffect(() => { void s.load() }, [s.load])

  const byIngredient = useMemo(() => new Map(s.ingredients.map((i) => [i.id, i])), [s.ingredients])
  const dishViews = useMemo(() => s.dishes.map((d) => dishView(d, byIngredient)), [s.dishes, byIngredient])
  const posCategoryName = (ids: number[]) => s.posCategories.find((c) => c.id === ids[0])?.name ?? '—'
  const dishes = filterDishes(dishViews, s.dishFilters)
  const ingredients = filterIngredients(s.ingredients, s.ingredientFilters)
  const levelOptions = (rows: { level: LevelFilter }[], active: LevelFilter, pick: (l: LevelFilter) => void) => [
    { key: 'all', label: t('filters.all'), count: rows.length, active: active === 'all', onClick: () => pick('all') },
    ...['low', 'medium', 'high', 'empty'].map((l) => ({ key: l, label: t(`levels.${l}`), count: countBy(rows, (r) => r.level === l), active: active === l, onClick: () => pick(l as LevelFilter) })),
  ]
  const menuSections: FilterSection[] = [
    { title: t('filters.dishStatus'), options: [
      { key: 'all', label: t('filters.all'), count: dishViews.length, active: s.dishFilters.status === 'all', onClick: () => s.setDishFilters({ status: 'all' }) },
      { key: 'available', label: t('filters.available'), count: countBy(dishViews, (d) => d.available), active: s.dishFilters.status === 'available', onClick: () => s.setDishFilters({ status: 'available' }) },
      { key: 'unavailable', label: t('filters.unavailable'), count: countBy(dishViews, (d) => !d.available), active: s.dishFilters.status === 'unavailable', onClick: () => s.setDishFilters({ status: 'unavailable' }) },
    ] },
    { title: t('filters.stockLevel'), options: levelOptions(dishViews.map((d) => ({ level: d.level ?? 'all' })), s.dishFilters.level, (level) => s.setDishFilters({ level })) },
    { title: t('filters.category'), options: [
      { key: 'all', label: t('filters.all'), count: dishViews.length, active: s.dishFilters.categoryId === null, onClick: () => s.setDishFilters({ categoryId: null }) },
      ...s.posCategories.map((c) => ({ key: String(c.id), label: c.name, count: countBy(dishViews, (d) => d.categoryIds.includes(c.id)), active: s.dishFilters.categoryId === c.id, onClick: () => s.setDishFilters({ categoryId: c.id }) })),
    ] },
  ]
  const ingredientSections: FilterSection[] = [
    { title: t('filters.stockLevel'), options: levelOptions(s.ingredients.map((i) => ({ level: ingredientLevel(i) })), s.ingredientFilters.level, (level) => s.setIngredientFilters({ level })) },
    { title: t('filters.category'), columns: 1, options: [
      { key: 'all', label: t('filters.all'), count: s.ingredients.length, active: s.ingredientFilters.categoryId === null, onClick: () => s.setIngredientFilters({ categoryId: null }) },
      ...s.ingredientCategories.map((c) => ({ key: String(c.id), label: `${categoryEmoji(c.name)} ${c.name}`, count: countBy(s.ingredients, (i) => i.categoryId === c.id), active: s.ingredientFilters.categoryId === c.id, onClick: () => s.setIngredientFilters({ categoryId: c.id }) })),
    ] },
  ]

  async function request(i: Ingredient) {
    if (i.supplierId === null) return toast({ title: t('request.noSupplier'), tone: 'danger' })
    try {
      await requestIngredient(i, requestQty(i.qty, i.thresholds))
      await s.refresh()
      toast({ title: t('request.successTitle'), body: t('request.successBody') })
    } catch (e) { toast({ title: t('error'), body: e instanceof Error ? e.message : String(e), tone: 'danger' }) }
  }
  async function remove(i: Ingredient) {
    setIngredientModal(null)
    try {
      await archiveIngredient(i.id)
      await s.refresh()
      toast({ title: t('request.deletedTitle'), body: t('request.deletedBody', { name: i.name }) })
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
              : <div className="p-2.5 grid grid-cols-3 gap-2.5 content-start">{dishes.map((d) => <DishCard key={d.id} dish={d} category={posCategoryName(d.categoryIds)} onOpen={() => setDetail(d)} />)}</div>)}
            {s.tab === 'ingredients' && (ingredients.length === 0 && !s.loading
              ? <KitEmptyState icon="inventory" title={t('ingredients.empty')} body={t('ingredients.emptyBody')} />
              : <ul className="p-2.5 flex flex-col gap-2">{ingredients.map((i) => <IngredientRow key={i.id} ingredient={i} onEdit={() => setIngredientModal({ kind: 'edit', ingredient: i })} onRequest={() => void request(i)} onDelete={() => setIngredientModal({ kind: 'delete', ingredient: i })} />)}</ul>)}
            {s.tab === 'requests' && <RequestList requests={s.requests} query={s.requestQuery} />}
          </div>
        </section>
      </div>
      <DishDetailModal dish={detail} category={detail ? posCategoryName(detail.categoryIds) : ''} ingredients={byIngredient} onClose={() => setDetail(null)} />
      <AddDishWizard open={addDish} onClose={() => setAddDish(false)} categories={s.posCategories} ingredients={s.ingredients} units={s.units} onSaved={s.refresh} />
      {(ingredientModal?.kind === 'add' || ingredientModal?.kind === 'edit') && (
        <AddIngredientWizard open onClose={() => setIngredientModal(null)} initial={ingredientModal.kind === 'edit' ? ingredientModal.ingredient : null}
          categories={s.ingredientCategories} units={s.units} suppliers={s.suppliers} onSaved={s.refresh} />
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
