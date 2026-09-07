'use client'

import { useTranslations } from 'next-intl'

import { Icon } from '@/components/kit/Icon'
import { KitEmptyState } from '@/components/kit/KitEmptyState'
import { cardPlacement, type ReservationCard, type Slot, type TimelineTable } from '@/lib/domain/reservations'
import { cn } from '@/lib/utils'

const SLOT_WIDTH = 132
const ROW_HEIGHT = 76

// Grilla mesa × hora del kit (Reservation / Home.png): una fila por mesa, una columna por franja de 30 min
// y la tarjeta tan ancha como dura la reserva.
export function ReservationTimeline({ slots, tables, onOpen }: { slots: Slot[]; tables: TimelineTable[]; onOpen: (card: ReservationCard) => void }) {
  const t = useTranslations('reservations')
  if (tables.length === 0) return <KitEmptyState icon="reservations" title={t('empty.tables')} body={t('empty.tablesBody')} />

  return (
    <div className="flex-1 min-h-0 overflow-auto">
      <div className="min-w-max">
        <div className="sticky top-0 z-10 flex bg-canvas border-b border-border">
          <span className="sticky left-0 z-10 w-[120px] shrink-0 bg-canvas border-r border-border px-4 py-3 text-[13px] font-semibold uppercase tracking-[0.08em] text-dim">{t('tableColumn')}</span>
          {slots.map((slot) => (
            <span key={slot.time} style={{ width: SLOT_WIDTH }}
              className={cn('shrink-0 px-3 py-3 text-[14px] font-semibold border-r border-border', slot.past ? 'text-dim' : 'text-soft')}>{slot.label}</span>
          ))}
        </div>
        {tables.map((table) => (
          <div key={table.id} className="flex border-b border-border" style={{ height: ROW_HEIGHT }}>
            <span className="sticky left-0 z-10 w-[120px] shrink-0 bg-surface border-r border-border px-4 flex items-center gap-2 text-[15px] font-semibold text-ink">
              {table.tableNumber}<span className="flex items-center gap-1 text-[13px] font-normal text-dim"><Icon name="user" size={14} />{table.seats}</span>
            </span>
            <div className="relative flex-1" style={{ width: slots.length * SLOT_WIDTH }}>
              {slots.map((slot, i) => (
                <span key={slot.time} className={cn('absolute top-0 bottom-0 border-r border-border', slot.past && 'bg-muted/50')}
                  style={{ left: i * SLOT_WIDTH, width: SLOT_WIDTH }} />
              ))}
              {table.reservations.map((card) => {
                const place = cardPlacement(card, slots)
                if (!place) return null
                return (
                  <button key={card.id} type="button" onClick={() => onOpen(card)}
                    style={{ left: place.index * SLOT_WIDTH + 6, width: place.span * SLOT_WIDTH - 12 }}
                    className={cn('absolute top-2 bottom-2 px-3 rounded-md border text-left flex flex-col justify-center gap-0.5 overflow-hidden',
                      card.state === 'seated' ? 'bg-success-soft border-success/40 text-success-ink' : 'bg-primary-soft border-primary/40 text-primary')}>
                    <span className="text-[12px] font-semibold opacity-80">ID# {card.name}</span>
                    <span className="flex items-center gap-2 text-[15px] font-semibold text-ink truncate">
                      {card.customerName}
                      <span className="flex items-center gap-1 text-[13px] font-normal text-soft"><Icon name="user" size={13} />{card.people}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
