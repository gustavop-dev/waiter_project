'use client'

import { useTranslations } from 'next-intl'

import { Icon } from '@/components/kit/Icon'
import { KitEmptyState } from '@/components/kit/KitEmptyState'
import { elapsedSeconds, formatClock } from '@/lib/domain/kitchen'
import type { KitchenTicket } from '@/lib/services/kitchen'

interface ReadyListProps { tickets: KitchenTicket[]; tableNumberOf: (tableId: number) => number; now: number; onServed: (courseId: number) => void }

const dishes = (t: KitchenTicket) => t.lines.reduce((acc, l) => acc + l.qty, 0)

// Columna "Listos por entregar": tarjeta del kit con cabecera y una fila por comanda; tocar la fila la marca entregada.
export function ReadyList({ tickets, tableNumberOf, now, onServed }: ReadyListProps) {
  const t = useTranslations('kds')
  return (
    <aside aria-label={t('ready')} className="w-[340px] shrink-0 bg-surface border border-border rounded-lg flex flex-col overflow-hidden">
      <header className="h-16 px-5 flex items-center justify-between border-b border-border">
        <h2 className="text-[18px] font-semibold text-ink">{t('ready')}</h2>
        <span className="min-w-7 h-7 px-2 rounded-md bg-success-soft text-success-ink grid place-items-center text-[14px] font-semibold">{tickets.length}</span>
      </header>
      {tickets.length === 0 && <KitEmptyState icon="check" title={t('readyEmpty')} />}
      <ul className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-2">
        {tickets.map((ticket) => {
          const n = tableNumberOf(ticket.tableId)
          return (
            <li key={ticket.id}>
              <button type="button" onClick={() => onServed(ticket.id)} title={t('serve')}
                className="w-full p-3 rounded-md border border-border bg-surface flex items-center gap-3 text-left hover:bg-muted">
                <span aria-hidden className="w-11 h-11 rounded-md bg-success-soft text-success-ink grid place-items-center text-[16px] font-semibold">{n}</span>
                <span className="flex-1 min-w-0 flex flex-col leading-tight">
                  <span className="text-[16px] font-semibold text-ink">{t('table', { n })} · {t('dishes', { n: dishes(ticket) })}</span>
                  <span className="text-[13px] text-soft">{t('readyAgo')} <span className="font-mono tabular text-success-ink">{formatClock(elapsedSeconds(ticket.readyAt ?? ticket.firedAt, now))}</span></span>
                </span>
                <span className="h-9 px-3 rounded-sm bg-primary text-primary-ink text-[14px] font-semibold inline-flex items-center gap-1"><Icon name="check" size={16} />{t('serve')}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
