'use client'

import { useTranslations } from 'next-intl'

import { Money } from '@/components/ui/Money'
import type { TableView } from '@/lib/domain/tableState'
import { cn } from '@/lib/utils'

const SURFACE = {
  free: 'bg-free text-white', occupied: 'bg-busy text-white', served: 'bg-busy text-white', kitchen: 'bg-kitchen text-white',
  ordering: 'bg-pending text-white', assist: 'bg-assist text-white', paid: 'bg-free-ink text-white',
  billing: 'bg-surface text-ink border-2 border-brand-500 ring-4 ring-brand-50',
  closed: 'bg-muted text-ink-3 border border-dashed border-border',
}

export function TableCell({ view, selected, onSelect }: { view: TableView; selected: boolean; onSelect: (id: number) => void }) {
  const t = useTranslations('pos.salon')
  const { table, state, total } = view
  const showAmount = total > 0
  return (
    <button
      type="button"
      onClick={() => onSelect(table.id)}
      aria-pressed={selected}
      className={cn('relative h-table-cell rounded-2xl p-3.5 flex flex-col justify-between text-left shadow-[inset_0_-3px_0_rgba(0,0,0,0.2)]',
        SURFACE[state], selected && state !== 'billing' && 'ring-4 ring-brand-300')}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[34px] font-bold leading-none">{table.number}</span>
        <span className="font-mono text-[13px] opacity-80">{t('pax', { count: table.seats })}</span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className={cn('text-[15px] font-medium whitespace-nowrap', state === 'billing' && 'text-brand-600 font-semibold')}>{t(`legend.${state}`)}</span>
        {showAmount && <Money amount={total} className="text-base" />}
      </div>
      <div className={cn('h-[9px] rounded-full', showAmount ? 'bg-black/30' : 'border border-dashed border-white/45')} />
    </button>
  )
}
