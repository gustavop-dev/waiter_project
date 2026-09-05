'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { CategoryPanel } from '@/components/catalog/CategoryPanel'
import { ProductForm } from '@/components/catalog/ProductForm'
import { Shell } from '@/components/layout/Shell'
import { Topbar } from '@/components/layout/Topbar'
import { Button } from '@/components/ui/Button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { formatCop } from '@/lib/domain/money'
import { listCategories, listProducts, listTaxes, saveCategory, saveProduct, type AdminCategory, type AdminProduct, type ProductInput, type Tax } from '@/lib/services/catalogAdmin'
import { useAuthStore } from '@/lib/stores/authStore'
import { useCatalogStore } from '@/lib/stores/catalogStore'
import { cn } from '@/lib/utils'

type Panel = { kind: 'none' } | { kind: 'product'; id: number | null } | { kind: 'categories' }
const EMPTY: ProductInput = { name: '', price: 0, categoryIds: [], taxIds: [], available: true, storable: false, favorite: false, description: '' }

export default function CatalogoPage() {
  const t = useTranslations('pos.catalog')
  const session = useAuthStore((s) => s.session)
  const reloadCatalog = useCatalogStore((s) => s.load)
  const [products, setProducts] = useState<AdminProduct[]>([])
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [taxes, setTaxes] = useState<Tax[]>([])
  const [filter, setFilter] = useState<number | 'all' | 'none'>('all')
  const [query, setQuery] = useState('')
  const [panel, setPanel] = useState<Panel>({ kind: 'none' })

  const load = () => Promise.all([listProducts(), listCategories(), listTaxes()]).then(([p, c, x]) => { setProducts(p); setCategories(c); setTaxes(x) })
  useEffect(() => { void load() }, [])

  const visible = products.filter((p) => (filter === 'all' || (filter === 'none' ? p.categoryIds.length === 0 : p.categoryIds.includes(filter))) && p.name.toLowerCase().includes(query.toLowerCase()))
  const categoryName = (ids: number[]) => ids.map((id) => categories.find((c) => c.id === id)?.name).filter(Boolean).join(', ') || t('uncategorized')
  const editing = panel.kind === 'product' ? products.find((p) => p.id === panel.id) : undefined
  async function onSaveProduct(input: ProductInput) {
    const id = await saveProduct(panel.kind === 'product' ? panel.id : null, input)
    await load()
    setPanel({ kind: 'product', id })
    if (session) void reloadCatalog(session.id)
  }
  const columns: Column<AdminProduct>[] = [
    { key: 'name', header: t('cols.product'), render: (p) => <span className="font-medium">{p.name}</span> },
    { key: 'cat', header: t('cols.category'), width: '180px', render: (p) => <span className="text-soft">{categoryName(p.categoryIds)}</span> },
    { key: 'price', header: t('cols.price'), width: '120px', align: 'right', render: (p) => <span className="font-mono tabular">{formatCop(p.price)}</span> },
    { key: 'tax', header: t('cols.tax'), width: '110px', render: (p) => <span className="text-soft">{taxes.find((x) => x.id === p.taxIds[0])?.name ?? '—'}</span> },
    { key: 'avail', header: t('cols.available'), width: '100px', render: (p) => <span className={cn('inline-flex h-[30px] px-2.5 rounded-lg items-center text-sm font-medium', p.available ? 'bg-free-soft text-free-ink' : 'bg-muted text-soft')}>{p.available ? t('yes') : t('no')}</span> },
    { key: 'fav', header: t('cols.favorite'), width: '90px', render: (p) => (p.favorite ? <span className="text-brand-600 font-bold">★</span> : <span className="text-ink-3">—</span>) },
  ]
  return (
    <Shell mode="sidebar" active="catalog">
      <Topbar left={<div className="flex flex-col gap-0.5"><span className="text-[22px] font-bold">{t('title')}</span><span className="text-[15px] text-soft">{t('subtitle', { products: products.length, categories: categories.length })}</span></div>}
        right={<><input aria-label={t('search')} placeholder={t('search')} value={query} onChange={(e) => setQuery(e.target.value)} className="h-tap px-4 rounded-[10px] border border-border bg-surface text-base w-64" />
          <Button onClick={() => setPanel({ kind: 'categories' })}>{t('categories')}</Button>
          <Button variant="primary" onClick={() => setPanel({ kind: 'product', id: null })}>{t('newProduct')}</Button></>} />
      <div className="flex-1 min-h-0 flex">
        <section className="flex-1 min-w-0 p-6 px-7 flex flex-col gap-4">
          <div className="flex flex-wrap gap-2" role="tablist" aria-label={t('categories')}>
            {[{ id: 'all' as const, name: t('all') }, ...categories, { id: 'none' as const, name: t('uncategorized') }].map((c) => (
              <button key={c.id} type="button" role="tab" aria-selected={filter === c.id} onClick={() => setFilter(c.id)}
                className={cn('h-tap-min px-4 rounded-full border text-[15px]', filter === c.id ? 'bg-ink text-canvas border-ink font-bold' : 'bg-surface border-border')}>{c.name}</button>
            ))}
          </div>
          <div className="flex-1 min-h-0 rounded-[18px] bg-surface border border-[#E9E2D7] flex flex-col overflow-hidden">
            <DataTable columns={columns} rows={visible} rowKey={(p) => p.id} emptyText={t('empty')} onRowClick={(p) => setPanel({ kind: 'product', id: p.id })} selectedKey={panel.kind === 'product' ? panel.id : null} />
          </div>
        </section>
        {panel.kind === 'product' && (
          <ProductForm key={panel.id ?? 'new'} initial={editing ? { name: editing.name, price: editing.price, categoryIds: editing.categoryIds, taxIds: editing.taxIds, available: editing.available, storable: editing.storable, favorite: editing.favorite, description: editing.description } : EMPTY} hasImage={editing?.hasImage} templateId={editing?.id ?? null} isNew={panel.id === null} categories={categories} taxes={taxes} onSave={onSaveProduct} onClose={() => setPanel({ kind: 'none' })} />
        )}
        {panel.kind === 'categories' && <CategoryPanel categories={categories} onSave={async (id, c) => { await saveCategory(id, c); await load() }} onClose={() => setPanel({ kind: 'none' })} />}
      </div>
    </Shell>
  )
}
