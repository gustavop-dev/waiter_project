'use client'

import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/Button'
import { elapsedSeconds, formatClock, ticketMood } from '@/lib/domain/kitchen'
import { BAR_SCALE_MIN, barFill, barTone } from '@/lib/domain/tableState'
import type { KitchenTicket } from '@/lib/services/kitchen'
import { cn } from '@/lib/utils'

const EDGE = { late: 'border-busy', attention: 'border-pending', fresh: 'border-free', normal: 'border-kds-raised' }
const TAG = { late: 'bg-busy text-white', attention: 'bg-pending text-white', fresh: 'bg-free text-white' }
const FILL = { ok: 'bg-free', warn: 'bg-pending', late: 'bg-busy' }
const MARKS = [12, 18]

interface TicketCardProps { ticket: KitchenTicket; tableNumber: number; now: number; onReady: (courseId: number) => void }

export function TicketCard({ ticket, tableNumber, now, onReady }: TicketCardProps) {
  const t = useTranslations('pos.kds')
  const seconds = elapsedSeconds(ticket.firedAt, now)
  const minutes = Math.floor(seconds / 60)
  const mood = ticketMood(ticket, now)
  return (
    <article aria-label={t('table', { n: tableNumber })} className={cn('bg-kds-surface rounded-lg border-2 p-5 flex flex-col gap-4 text-kds-ink', EDGE[mood])}>
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold leading-none">{t('table', { n: tableNumber })}</h2>
          <p className="mt-2 text-sm text-sidebar-soft">#{ticket.tracking} · {ticket.waiter}</p>
        </div>
        <div className="text-right">
          <span className={cn('font-mono tabular text-[34px] leading-none', mood === 'late' && 'text-busy-soft')}>{formatClock(seconds)}</span>
          {mood !== 'normal' && <span className={cn('block mt-2 ml-auto w-fit rounded-full px-2.5 h-7 leading-7 text-[13px] font-medium', TAG[mood])}>{t(`mood.${mood}`)}</span>}
        </div>
      </header>
      <ul className="flex flex-col gap-2.5 text-lg">
        {ticket.lines.map((l) => (
          <li key={l.id}>
            <span className="font-mono tabular font-medium mr-2">{l.qty}×</span><span className="font-medium">{l.name}</span>
            {l.note && <p className="text-[15px] text-sidebar-soft pl-9">{l.note}</p>}
          </li>
        ))}
      </ul>
      <div className="mt-auto">
        <div className="relative h-2 rounded-full bg-kds-raised">
          <span className={cn('absolute inset-y-0 left-0 rounded-full', FILL[barTone(minutes)])} style={{ width: `${barFill(minutes)}%` }} />
          {MARKS.map((m) => <span key={m} aria-hidden className="absolute -top-0.5 -bottom-0.5 w-px bg-sidebar-dim" style={{ left: `${(m / BAR_SCALE_MIN) * 100}%` }} />)}
        </div>
        <div className="relative h-4 mt-1.5 text-[12px] text-sidebar-dim font-mono tabular">
          <span className="absolute left-0">0</span>
          {MARKS.map((m) => <span key={m} className="absolute -translate-x-1/2" style={{ left: `${(m / BAR_SCALE_MIN) * 100}%` }}>{m}</span>)}
          <span className="absolute right-0">{BAR_SCALE_MIN} {t('minutes')}</span>
        </div>
      </div>
      <Button variant="primary" className="w-full" onClick={() => onReady(ticket.id)}>{t('readyBtn')}</Button>
    </article>
  )
}
