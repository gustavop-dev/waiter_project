'use client'

import { useTranslations } from 'next-intl'

import { Chip } from '@/components/kit/Chip'
import { Icon } from '@/components/kit/Icon'
import { cn } from '@/lib/utils'

export interface FilterOption { key: string; label: string; count?: number; active: boolean; onClick: () => void }
export interface FilterSection { title: string; options: FilterOption[]; columns?: 1 | 2 }

// Panel "Filter" del kit: secciones en versalitas, chips con conteo en rejilla y "Reset Filter" abajo.
export function FilterPanel({ sections, onReset }: { sections: FilterSection[]; onReset: () => void }) {
  const t = useTranslations('pantry')
  return (
    <aside aria-label={t('filters.title')} className="w-[352px] shrink-0 min-h-0 bg-surface border border-border rounded-lg flex flex-col">
      <header className="h-14 px-4 flex items-center border-b border-border shrink-0"><h2 className="text-[16px] font-semibold text-ink">{t('filters.title')}</h2></header>
      <div className="flex-1 min-h-0 overflow-auto p-2.5 flex flex-col gap-3">
        {sections.map((s) => (
          <section key={s.title} aria-label={s.title} className="flex flex-col gap-2">
            <h3 className="text-[12px] font-semibold text-ink uppercase tracking-wide">{s.title}</h3>
            <div className={cn('grid gap-2 [&>button]:w-full [&>button]:justify-between [&>button]:px-2.5', s.columns === 1 ? 'grid-cols-1' : 'grid-cols-2')}>
              {s.options.map((o) => <Chip key={o.key} label={o.label} count={o.count} active={o.active} onClick={o.onClick} />)}
            </div>
          </section>
        ))}
      </div>
      <footer className="p-2.5 border-t border-border shrink-0">
        <button type="button" onClick={onReset} className="w-full h-12 rounded-md border border-border bg-surface text-[16px] font-semibold text-ink flex items-center justify-center gap-2 hover:bg-muted">
          <Icon name="refresh" size={20} />{t('actions.resetFilters')}
        </button>
      </footer>
    </aside>
  )
}
