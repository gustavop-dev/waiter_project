'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Icon } from '@/components/kit/Icon'
import { Modal } from '@/components/kit/Modal'
import { Button } from '@/components/ui/Button'
import { isoDate, monthGrid, type Slot } from '@/lib/domain/reservations'
import { cn } from '@/lib/utils'

const WEEKDAYS = ['Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá', 'Do']

// Modal "Select Date / Select Time" del kit: calendario mensual a la izquierda, franjas de 30 min a la
// derecha y el resumen en el pie. Las franjas pasadas de hoy vienen marcadas por el servidor.
export function DateTimeModal({ open, onClose, date, time, slots, onPick }: {
  open: boolean; onClose: () => void; date: string | null; time: number | null; slots: Slot[]
  onPick: (date: string, time: number) => void
}) {
  const t = useTranslations('reservations.dateTime')
  const initial = date ? new Date(`${date}T00:00:00`) : new Date()
  const [cursor, setCursor] = useState({ year: initial.getFullYear(), month: initial.getMonth() })
  const [day, setDay] = useState<string | null>(date)
  const [slot, setSlot] = useState<number | null>(time)
  const monthName = new Date(cursor.year, cursor.month, 1).toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
  const move = (delta: number) => setCursor(({ year, month }) => {
    const next = new Date(year, month + delta, 1)
    return { year: next.getFullYear(), month: next.getMonth() }
  })

  return (
    <Modal open={open} onClose={onClose} title={t('title')} size="wide" footer={
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-4 text-[15px] text-soft">
          <span className="flex items-center gap-2"><Icon name="reservations" size={18} />{day ? new Date(`${day}T00:00:00`).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'long' }) : t('notSelected')}</span>
          <span className="flex items-center gap-2"><Icon name="clock" size={18} />{slot !== null ? slots.find((s) => s.time === slot)?.label ?? '' : t('notSelected')}</span>
        </span>
        <span className="flex gap-3">
          <Button onClick={onClose}>{t('cancel')}</Button>
          <Button variant="primary" disabled={!day || slot === null} onClick={() => { if (day && slot !== null) onPick(day, slot) }}>{t('apply')}</Button>
        </span>
      </div>
    }>
      <div className="h-full flex">
        <section className="flex-1 p-6 border-r border-border">
          <header className="flex items-center justify-between mb-4">
            <span className="text-[17px] font-semibold text-ink first-letter:uppercase">{monthName}</span>
            <span className="flex gap-1">
              <button type="button" aria-label={t('prevMonth')} onClick={() => move(-1)} className="w-9 h-9 rounded-md border border-border grid place-items-center text-soft"><Icon name="chevronLeft" size={18} /></button>
              <button type="button" aria-label={t('nextMonth')} onClick={() => move(1)} className="w-9 h-9 rounded-md border border-border grid place-items-center text-soft"><Icon name="chevronRight" size={18} /></button>
            </span>
          </header>
          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((w) => <span key={w} className="h-8 grid place-items-center text-[13px] font-semibold text-dim">{w}</span>)}
            {monthGrid(cursor.year, cursor.month).map((d, i) => {
              if (d === null) return <span key={`gap-${i}`} />
              const value = isoDate(cursor.year, cursor.month, d)
              return (
                <button key={value} type="button" aria-pressed={day === value} onClick={() => setDay(value)}
                  className={cn('h-10 rounded-md text-[15px]', day === value ? 'bg-primary text-primary-ink font-semibold' : 'text-ink hover:bg-muted')}>{d}</button>
              )
            })}
          </div>
        </section>
        <section className="w-[280px] shrink-0 p-6 overflow-auto">
          <p className="mb-3 text-[15px] font-semibold text-ink">{t('chooseTime')}</p>
          <div className="grid grid-cols-2 gap-2">
            {slots.map((s) => (
              <button key={s.time} type="button" disabled={s.past} aria-pressed={slot === s.time} onClick={() => setSlot(s.time)}
                className={cn('h-11 rounded-md border text-[15px] font-semibold',
                  slot === s.time ? 'bg-primary border-primary text-primary-ink' : s.past ? 'border-border text-dim opacity-50' : 'border-border text-soft hover:bg-muted')}>{s.label}</button>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  )
}
