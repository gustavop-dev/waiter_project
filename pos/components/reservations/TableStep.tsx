'use client'

import { useTranslations } from 'next-intl'

import { Icon } from '@/components/kit/Icon'
import { Button } from '@/components/ui/Button'
import { hourLabel } from '@/lib/domain/reservations'
import type { AvailableTable } from '@/lib/services/reservations'
import { cn } from '@/lib/utils'

const STATUS: Record<AvailableTable['status'], string> = {
  available: 'bg-surface border-border text-ink',
  reserved: 'bg-reserved border-reserved text-reserved-ink',
  unavailable: 'bg-muted border-border text-dim',
}

// Paso 2 del kit (Select Table.png): las mesas del día con la leyenda de tres estados y la barra flotante.
export function TableStep({ tables, date, time, selected, onSelect, onContinue }: {
  tables: AvailableTable[]; date: string; time: number; selected: number | null
  onSelect: (id: number | null) => void; onContinue: () => void
}) {
  const t = useTranslations('reservations.table')
  const chosen = tables.find((x) => x.id === selected)

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <header className="px-6 py-4 flex items-center justify-between border-b border-border">
        <span className="flex items-center gap-2 h-10 px-3 rounded-md bg-primary-soft text-primary text-[15px] font-semibold">
          <Icon name="reservations" size={16} />{new Date(`${date}T00:00:00`).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric' })}
          <Icon name="clock" size={16} />{hourLabel(time)}
        </span>
        <span className="flex items-center gap-5 text-[14px] text-soft">
          {(['available', 'reserved', 'unavailable'] as const).map((s) => (
            <span key={s} className="flex items-center gap-2">
              <span className={cn('w-2.5 h-2.5 rounded-full', s === 'available' ? 'bg-border' : s === 'reserved' ? 'bg-reserved' : 'bg-dim')} />{t(`legend.${s}`)}
            </span>
          ))}
        </span>
      </header>

      <div className="flex-1 min-h-0 overflow-auto p-6">
        <div className="flex flex-wrap gap-4">
          {tables.map((table) => (
            <button key={table.id} type="button" disabled={table.status !== 'available'} aria-pressed={selected === table.id}
              onClick={() => onSelect(selected === table.id ? null : table.id)}
              className={cn('w-[168px] h-[132px] rounded-lg border-2 p-4 flex flex-col justify-between text-left', STATUS[table.status],
                selected === table.id && 'ring-2 ring-primary border-primary')}>
              <span className="text-[20px] font-semibold">{table.tableNumber}</span>
              <span className="flex items-center gap-1.5 text-[13px] opacity-80"><Icon name="user" size={14} />{t('seats', { count: table.seats })}</span>
              {table.reservedAt && <span className="text-[13px] font-semibold flex items-center gap-1"><Icon name="clock" size={13} />{table.reservedAt}</span>}
            </button>
          ))}
        </div>
      </div>

      {chosen && (
        <div className="mx-auto mb-6 h-16 px-4 rounded-lg bg-[#131316] text-[#F7F7F7] flex items-center gap-4 shadow-xl">
          <span className="text-[15px]">{t('selected')}</span>
          <span className="h-10 px-4 rounded-md bg-surface text-ink text-[15px] font-semibold flex items-center gap-2">
            {t('tableName', { number: chosen.tableNumber })}
            <button type="button" aria-label={t('clear')} onClick={() => onSelect(null)} className="text-soft"><Icon name="close" size={16} /></button>
          </span>
          <Button variant="primary" onClick={onContinue}>{t('continue')}<Icon name="arrowRight" size={18} /></Button>
        </div>
      )}
    </div>
  )
}
