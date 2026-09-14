'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { CategoryPanel } from '@/components/catalog/CategoryPanel'
import { DEFAULT_FILTERS, FilterPanel, type CatalogFilters } from '@/components/catalog/FilterPanel'
import { ProductCard } from '@/components/catalog/ProductCard'
import { ProductForm } from '@/components/catalog/ProductForm'
import { Card } from '@/components/kit/Card'
import { Icon } from '@/components/kit/Icon'
import { KitEmptyState } from '@/components/kit/KitEmptyState'
import { KitShell } from '@/components/kit/KitShell'
import { Button } from '@/components/ui/Button'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { listCategories, listProducts, listTaxes, saveCategory, saveProduct, type AdminCategory, type AdminProduct, type ProductInput, type Tax } from '@/lib/services/catalogAdmin'
import { useAuthStore } from '@/lib/stores/authStore'
import { useCatalogStore } from '@/lib/stores/catalogStore'

type Panel = { kind: 'none' } | { kind: 'product'; id: number | null } | { kind: 'categories' }
const EMPTY: ProductInput = { name: '', price: 0, categoryIds: [], taxIds: [], available: true, storable: false, favorite: false, description: '', dinerAttributes: {} }

const matches = (p: AdminProduct, f: CatalogFilters, query: string) =>
  (f.status === 'all' || (f.status === 'available' ? p.available : !p.available)) && (f.fav === 'all' || p.favorite)
  && (f.category === 'all' || (f.category === 'none' ? p.categoryIds.length === 0 : p.categoryIds.includes(f.category))) && p.name.toLowerCase().includes(query.toLowerCase())

// Catálogo con la estructura de "Menu List" del kit: filtros a la izquierda, rejilla de tarjetas con foto a la derecha.
export default function CatalogoPage() {
  const t = useTranslations('admin.catalog')
  const session = useAuthStore((s) => s.session)
  const reloadCatalog = useCatalogStore((s) => s.load)
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [taxes, setTaxes] = useState<Tax[]>([])
  const [filters, setFilters] = useState<CatalogFilters>(DEFAULT_FILTERS)
  const [query, setQuery] = useState('')
  const [panel, setPanel] = useState<Panel>({ kind: 'none' })

  const load = () => Promise.all([listProducts(), listCategories(), listTaxes()]).then(([p, c, x]) => { setProducts(p); setCategories(c); setTaxes(x) })
  useEffect(() => { void load() }, [])

  const searched = products.filter((p) => p.name.toLowerCase().includes(query.toLowerCase()))
  const visible = products.filter((p) => matches(p, filters, query))
  const count = (pred: (p: AdminProduct) => boolean) => searched.filter(pred).length
  const counts = {
    status: { all: searched.length, available: count((p) => p.available), hidden: count((p) => !p.available) },
    fav: { all: searched.length, favorite: count((p) => p.favorite) },
    category: { all: searched.length, none: count((p) => p.categoryIds.length === 0), ...Object.fromEntries(categories.map((c) => [String(c.id), count((p) => p.categoryIds.includes(c.id))])) },
  }
  const categoryName = (ids: number[]) => ids.map((id) => categories.find((c) => c.id === id)?.name).filter(Boolean).join(', ') || t('uncategorized')
  const editing = panel.kind === 'product' ? products.find((p) => p.id === panel.id) : undefined
  async function onSaveProduct(input: ProductInput) {
    const id = await saveProduct(panel.kind === 'product' ? panel.id : null, input)
    await load()
    setPanel({ kind: 'product', id })
    void reloadCatalog(session?.id ?? null)
  }
  return (
    <KitShell>
      <PageHeader icon="catalog" title={t('title')} actions={<>
        <SearchInput value={query} onChange={setQuery} placeholder={t('search')} className="w-[320px]" />
        <Button onClick={() => setPanel({ kind: 'categories' })}><Icon name="tag" size={18} />{t('categories')}</Button>
        <Button variant="primary" onClick={() => setPanel({ kind: 'product', id: null })}><Icon name="plus" size={18} />{t('newProduct')}</Button>
      </>}>
        <span className="text-[14px] text-soft">{t('subtitle', { products: products.length, categories: categories.length })}</span>
      </PageHeader>
      <div className="flex-1 min-h-0 flex gap-4 px-5 pb-5">
        <FilterPanel filters={filters} counts={counts} categories={categories} onChange={setFilters} />
        <Card title={t('list')} className="flex-1 min-w-0">
          <div className="h-full overflow-y-auto p-4">
            {visible.length === 0 && <KitEmptyState icon="catalog" title={t('empty')} body={t('emptyBody')} />}
            <div className="grid grid-cols-3 gap-4">
              {visible.map((p) => <ProductCard key={p.id} product={p} categoryNames={categoryName(p.categoryIds)} taxName={taxes.find((x) => x.id === p.taxIds[0])?.name ?? null}
                selected={panel.kind === 'product' && panel.id === p.id} onClick={() => setPanel({ kind: 'product', id: p.id })} />)}
            </div>
          </div>
        </Card>
      </div>
      {panel.kind === 'product' && (
        <ProductForm key={panel.id ?? 'new'} initial={editing ? { name: editing.name, price: editing.price, categoryIds: editing.categoryIds, taxIds: editing.taxIds, available: editing.available, storable: editing.storable, favorite: editing.favorite, description: editing.description, dinerAttributes: editing.dinerAttributes } : EMPTY}
          extraProducts={products.filter(p=>p.available&&p.variantId&&p.id!==editing?.id).map(p=>({id:p.variantId!,name:p.name}))} hasImage={editing?.hasImage} templateId={editing?.id ?? null} isNew={panel.id === null} categories={categories} taxes={taxes} onSave={onSaveProduct} onClose={() => setPanel({ kind: 'none' })} />
      )}
      {panel.kind === 'categories' && <CategoryPanel categories={categories} productCount={(id) => products.filter((p) => p.categoryIds.includes(id)).length} onSave={async (id, c) => { await saveCategory(id, c); await load() }} onClose={() => setPanel({ kind: 'none' })} />}
    </KitShell>
  )
}
