'use client'

import { useTranslations } from 'next-intl'

import type { TableState } from '@/lib/domain/tableState'

const SHOWN: Array<[TableState, string]> = [['free', 'bg-free'], ['occupied', 'bg-busy'], ['kitchen', 'bg-kitchen'], ['ordering', 'bg-pending']]

export function StateLegend({ counts }: { counts: Record<TableState, number> }) {
  const t = useTranslations('pos.salon.legend')
  return (
    <div className="flex items-center gap-2 text-sm text-soft">
      {SHOWN.map(([state, color]) => (
        <span key={state} className="inline-flex items-center gap-1.5">
          <span className={`w-2.5 h-2.5 rounded-[3px] ${color}`} />{t(state)} {counts[state]}
        </span>
      ))}
    </div>
  )
}
