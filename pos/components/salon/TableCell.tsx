'use client'

import { useTranslations } from 'next-intl'

import { Money } from '@/components/ui/Money'
import { barFill, barTone, elapsedMinutes, formatElapsed } from '@/lib/domain/tableState'
import type { TableView } from '@/lib/domain/tableState'
import { cn } from '@/lib/utils'

const SURFACE = {
  free: 'bg-free text-white', occupied: 'bg-busy text-white', served: 'bg-busy text-white', kitchen: 'bg-kitchen text-white',
  ordering: 'bg-pending text-white', assist: 'bg-assist text-white', paid: 'bg-free-ink text-white',
  billing: 'bg-surface text-ink border-2 border-brand-500 ring-4 ring-brand-50',
  closed: 'bg-muted text-ink-3 border border-dashed border-border',
}
// Las "sillas" llevan el color de la mesa; la cerrada no tiene.
const CHAIR = {
  free: 'bg-free', occupied: 'bg-busy', served: 'bg-busy', kitchen: 'bg-kitchen', ordering: 'bg-pending',
  assist: 'bg-assist', paid: 'bg-free-ink', billing: 'bg-surface', closed: '',
}
const FILL = { ok: 'bg-white', warn: 'bg-pending-soft', late: 'bg-busy-soft' }
const CHAIRS = ['-left-[5px] top-6', '-left-[5px] bottom-6', '-right-[5px] top-6', '-right-[5px] bottom-6']

interface Props { view: TableView; selected: boolean; onSelect: (id: number) => void; now: number }

export function TableCell({ view, selected, onSelect, now }: Props) {
  const t = useTranslations('pos.salon')
  const { table, state, total, startedAt } = view
  const minutes = startedAt ? elapsedMinutes(startedAt, now) : null
  const showAmount = total > 0
  return (
    <button
      type="button"
      onClick={() => onSelect(table.id)}
      aria-pressed={selected}
      className={cn('relative h-table-cell rounded-2xl py-3 px-3 flex flex-col justify-between text-left shadow-[inset_0_-3px_0_rgba(0,0,0,0.2)]',
        SURFACE[state], selected && state !== 'billing' && 'ring-4 ring-brand-300')}
    >
      {CHAIR[state] && CHAIRS.map((pos) => <span key={pos} aria-hidden className={cn('absolute w-[9px] h-[30px] rounded-[3px] opacity-60', CHAIR[state], pos)} />)}
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[34px] font-bold leading-none tracking-[-0.03em]">{table.number}</span>
        <span className="font-mono text-[13px] opacity-80">{minutes === null ? t('pax', { count: table.seats }) : formatElapsed(minutes)}</span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className={cn('text-[14px] font-medium whitespace-nowrap', state === 'billing' && 'text-brand-600 font-bold')}>{t(`legend.${state}`)}</span>
        {showAmount && <Money amount={total} className="text-[14px]" />}
      </div>
      {minutes === null ? (
        <div className="h-[9px] rounded-full border border-dashed border-white/45" />
      ) : (
        <div className="relative h-[9px] rounded-full bg-black/30 overflow-hidden" role="progressbar" aria-valuenow={barFill(minutes)} aria-valuemin={0} aria-valuemax={100}>
          <span className={cn('absolute inset-y-0 left-0 rounded-full', state === 'billing' ? 'bg-brand-500' : FILL[barTone(minutes)])} style={{ width: `${barFill(minutes)}%` }} />
          <span className="absolute top-0 bottom-0 w-[2px] bg-black/30" style={{ left: '55%' }} />
          <span className="absolute top-0 bottom-0 w-[2px] bg-black/30" style={{ left: '82%' }} />
        </div>
      )}
    </button>
  )
}
