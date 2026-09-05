'use client'

import { useTranslations } from 'next-intl'

import { elapsedSeconds, formatClock } from '@/lib/domain/kitchen'
import type { KitchenTicket } from '@/lib/services/kitchen'

interface ReadyListProps { tickets: KitchenTicket[]; tableNumberOf: (tableId: number) => number; now: number; onServed: (courseId: number) => void }

const dishes = (t: KitchenTicket) => t.lines.reduce((acc, l) => acc + l.qty, 0)

export function ReadyList({ tickets, tableNumberOf, now, onServed }: ReadyListProps) {
  const t = useTranslations('pos.kds')
  return (
    <aside aria-label={t('ready')} className="w-panel-lg shrink-0 border-l border-kds-raised p-6 flex flex-col gap-4 bg-kds-bg">
      <h2 className="text-xl font-bold">{t('ready')}</h2>
      {tickets.length === 0 && <p className="text-sidebar-soft">{t('readyEmpty')}</p>}
      <ul className="flex flex-col gap-2.5">
        {tickets.map((ticket) => (
          <li key={ticket.id}>
            <button type="button" onClick={() => onServed(ticket.id)} title={t('serve')}
              className="w-full h-tap px-4 rounded-md bg-kds-raised flex items-center justify-between gap-3 text-left hover:bg-brand-500 hover:text-ink">
              <span className="text-lg font-medium">{t('table', { n: tableNumberOf(ticket.tableId) })} · {t('dishes', { n: dishes(ticket) })}</span>
              <span className="font-mono tabular text-lg text-free-soft">{formatClock(elapsedSeconds(ticket.readyAt ?? ticket.firedAt, now))}</span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
