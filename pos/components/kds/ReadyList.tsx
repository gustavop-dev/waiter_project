'use client'

import { useTranslations } from 'next-intl'

import { Icon } from '@/components/kit/Icon'
import { KitEmptyState } from '@/components/kit/KitEmptyState'
import { elapsedSeconds, formatClock } from '@/lib/domain/kitchen'
import type { KitchenTicket } from '@/lib/services/kitchen'
import { cn } from '@/lib/utils'

interface ReadyListProps {
  tickets: KitchenTicket[]; tableNumberOf: (tableId: number) => number; now: number
  onServed: (courseId: number) => void; onServedDish: (lineId: number) => void
}

const pending = (t: KitchenTicket) => t.lines.filter((l) => !l.servedAt)
const dishes = (t: KitchenTicket) => pending(t).reduce((acc, l) => acc + l.qty, 0)

// Columna "Listos por entregar". Un plato se entrega solo: la comanda sale por partes de la barra y quien la
// lleva no siempre se lleva todo de una vez. "Entregar todo" cierra la comanda entera cuando sí es de una vez.
export function ReadyList({ tickets, tableNumberOf, now, onServed, onServedDish }: ReadyListProps) {
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
            <li key={ticket.id} aria-label={t('table', { n })} className="p-3 rounded-md border border-border bg-surface flex flex-col gap-2.5">
              <div className="flex items-center gap-3">
                <span aria-hidden className="w-11 h-11 shrink-0 rounded-md bg-success-soft text-success-ink grid place-items-center text-[16px] font-semibold">{n}</span>
                <span className="flex-1 min-w-0 flex flex-col leading-tight">
                  <span className="text-[16px] font-semibold text-ink">{t('table', { n })} · {t('dishes', { n: dishes(ticket) })}</span>
                  <span className="text-[13px] text-soft">{t('readyAgo')} <span className="font-mono tabular text-success-ink">{formatClock(elapsedSeconds(ticket.readyAt ?? ticket.firedAt, now))}</span></span>
                </span>
              </div>
              <ul className="flex flex-col gap-1.5">
                {ticket.lines.map((line) => {
                  const done = Boolean(line.servedAt)
                  return (
                    <li key={line.id} className={cn('h-10 pl-2.5 pr-1.5 rounded-sm flex items-center gap-2 text-[14px]', done ? 'bg-muted text-dim' : 'bg-canvas text-ink')}>
                      <span className={cn('flex-1 min-w-0 truncate', done && 'line-through')}>{line.qty > 1 && <span className="tabular">{line.qty}× </span>}{line.name}</span>
                      {done ? (
                        <span className="shrink-0 inline-flex items-center gap-1 text-[13px] font-semibold"><Icon name="check" size={14} />{t('dishServed')}</span>
                      ) : (
                        <button type="button" onClick={() => onServedDish(line.id)}
                          className="shrink-0 h-8 px-2.5 rounded-sm border border-border bg-surface text-[13px] font-semibold text-ink inline-flex items-center gap-1">
                          <Icon name="check" size={14} />{t('serveDish')}
                        </button>
                      )}
                    </li>
                  )
                })}
              </ul>
              <button type="button" onClick={() => onServed(ticket.id)}
                className="h-10 rounded-sm bg-primary text-primary-ink text-[14px] font-semibold inline-flex items-center justify-center gap-1.5">
                <Icon name="checks" size={16} />{t('serveAll')}
              </button>
            </li>
          )
        })}
      </ul>
    </aside>
  )
}
