'use client'

import { useTranslations } from 'next-intl'

import { Chip } from '@/components/kit/Chip'
import { Icon } from '@/components/kit/Icon'
import { Button } from '@/components/ui/Button'
import type { AdminCategory } from '@/lib/services/catalogAdmin'

export type StatusFilter = 'all' | 'available' | 'hidden'
export type FavFilter = 'all' | 'favorite'
export type CategoryFilter = number | 'all' | 'none'
export interface CatalogFilters { status: StatusFilter; fav: FavFilter; category: CategoryFilter }
export const DEFAULT_FILTERS: CatalogFilters = { status: 'all', fav: 'all', category: 'all' }

interface FilterPanelProps { filters: CatalogFilters; counts: { status: Record<StatusFilter, number>; fav: Record<FavFilter, number>; category: Record<string, number> }; categories: AdminCategory[]; onChange: (f: CatalogFilters) => void }

// Panel "Filter" del kit (Inventory / Menu List / Home.png): secciones con chips de conteo y "Reset Filter" al pie.
export function FilterPanel({ filters, counts, categories, onChange }: FilterPanelProps) {
  const t = useTranslations('admin.catalog')
  const tc = useTranslations('admin.common')
  const section = (title: string, children: React.ReactNode) => <div className="flex flex-col gap-2"><p className="text-[12px] font-semibold uppercase tracking-wide text-soft">{title}</p><div className="flex flex-wrap gap-2">{children}</div></div>
  return (
    <aside aria-label={tc('filter')} className="w-[360px] shrink-0 bg-surface border border-border rounded-lg flex flex-col overflow-hidden">
      <header className="h-16 px-5 flex items-center border-b border-border"><h2 className="text-[18px] font-semibold text-ink">{tc('filter')}</h2></header>
      <div className="flex-1 min-h-0 overflow-y-auto p-5 flex flex-col gap-5">
        {section(t('filters.status'), (['all', 'available', 'hidden'] as StatusFilter[]).map((s) => <Chip key={s} label={t(`status.${s}`)} count={counts.status[s]} active={filters.status === s} onClick={() => onChange({ ...filters, status: s })} />))}
        {section(t('filters.favorite'), (['all', 'favorite'] as FavFilter[]).map((s) => <Chip key={s} label={t(`fav.${s}`)} count={counts.fav[s]} active={filters.fav === s} onClick={() => onChange({ ...filters, fav: s })} />))}
        {section(t('filters.category'), [
          <Chip key="all" label={tc('all')} count={counts.category.all ?? 0} active={filters.category === 'all'} onClick={() => onChange({ ...filters, category: 'all' })} />,
          ...categories.map((c) => <Chip key={c.id} label={c.name} count={counts.category[String(c.id)] ?? 0} active={filters.category === c.id} onClick={() => onChange({ ...filters, category: c.id })} />),
          <Chip key="none" label={t('uncategorized')} count={counts.category.none ?? 0} active={filters.category === 'none'} onClick={() => onChange({ ...filters, category: 'none' })} />,
        ])}
      </div>
      <footer className="p-4 border-t border-border"><Button className="w-full" onClick={() => onChange(DEFAULT_FILTERS)}><Icon name="refresh" size={18} />{tc('reset')}</Button></footer>
    </aside>
  )
}
