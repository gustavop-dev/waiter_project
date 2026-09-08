'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

import { Icon } from '@/components/kit/Icon'
import { parseFloorName, type FloorType } from '@/lib/domain/tablesKit'
import type { Floor } from '@/lib/types'
import { cn } from '@/lib/utils'

const TABS_MAX = 3

// Leyenda del kit: punto vacío (disponible), naranja (no disponible), tinta (reservada).
export function TableLegend() {
  const t = useTranslations('tables.legend')
  return (
    <ul className="flex items-center gap-4 text-[14px] text-soft" aria-label={t('available')}>
      <li className="flex items-center gap-1.5"><span aria-hidden className="w-2 h-2 rounded-full bg-primary" />{t('available')}</li>
      <li className="flex items-center gap-1.5"><span aria-hidden className="w-2 h-2 rounded-full bg-progress" />{t('unavailable')}</li>
      <li className="flex items-center gap-1.5"><span aria-hidden className="w-2 h-2 rounded-full bg-success" />{t('ready')}</li>
      <li className="flex items-center gap-1.5"><span aria-hidden className="w-2 h-2 rounded-full bg-reserved" />{t('reserved')}</li>
    </ul>
  )
}

// Hasta tres pisos: pestañas en píldora gris (Home.png). Con cuatro o más: desplegable "Piso #N" (If Floor 4+.png).
export function FloorSwitcher({ floors, activeId, onChange }: { floors: Floor[]; activeId: number | null; onChange: (id: number) => void }) {
  const t = useTranslations('tables')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [open])
  const label = (f: Floor) => parseFloorName(f.name).label
  if (floors.length <= TABS_MAX) {
    return (
      <div role="tablist" aria-label={t('floors')} className="inline-flex items-center gap-0.5 p-1 rounded-md bg-muted">
        {floors.map((f) => (
          <button key={f.id} type="button" role="tab" aria-selected={f.id === activeId} onClick={() => onChange(f.id)}
            className={cn('h-10 px-3.5 rounded-sm text-[15px] font-semibold whitespace-nowrap', f.id === activeId ? 'bg-surface border border-border text-ink' : 'text-dim')}>{label(f)}</button>
        ))}
      </div>
    )
  }
  const active = floors.find((f) => f.id === activeId)
  const index = active ? floors.indexOf(active) + 1 : 1
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} onClick={() => setOpen((v) => !v)}
        className="h-12 px-4 rounded-md border border-border bg-surface flex items-center gap-2 text-[15px] font-semibold text-ink">
        {active ? label(active) : t('floorPicker', { number: index })}<Icon name="chevronDown" size={18} />
      </button>
      {open && (
        <ul role="listbox" aria-label={t('floors')} className="absolute right-0 top-14 z-30 min-w-[220px] p-2 rounded-md bg-surface border border-border shadow-xl flex flex-col gap-0.5">
          {floors.map((f, i) => (
            <li key={f.id} role="option" aria-selected={f.id === activeId} onClick={() => { onChange(f.id); setOpen(false) }}
              className={cn('h-11 px-3 rounded-sm flex items-center justify-between gap-3 text-[15px] cursor-pointer', f.id === activeId ? 'bg-primary-soft text-primary font-semibold' : 'text-ink hover:bg-muted')}>
              <span>{label(f)}</span><span className="text-[13px] text-dim">#{i + 1}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// Chip flotante "Info del piso: Tipo Interior >" (Dropdown.png); al tocarlo muestra las mesas libres por tamaño.
export function FloorInfoChip({ type, remaining }: { type: FloorType; remaining: { large: number; small: number } }) {
  const t = useTranslations('tables.floorInfo')
  const [open, setOpen] = useState(false)
  return (
    <div className="absolute left-6 top-6 z-10 rounded-md bg-surface border border-border shadow-lg text-[14px]">
      <button type="button" aria-expanded={open} aria-label={t('toggle')} onClick={() => setOpen((v) => !v)} className="h-11 pl-3 pr-2 flex items-center gap-2">
        <span className="font-semibold text-ink">{t('label')}</span>
        <span className="text-soft">{t('type')} <strong className="text-ink font-semibold">{t(type)}</strong></span>
        <span className="w-6 h-6 rounded-sm border-l border-border grid place-items-center text-soft"><Icon name={open ? 'chevronDown' : 'chevronRight'} size={16} /></span>
      </button>
      {open && (
        <dl className="px-3 pb-3 pt-1 border-t border-border grid grid-cols-[1fr_auto] gap-x-6 gap-y-1 text-soft">
          <dt>{t('remainingLarge')}</dt><dd className="font-semibold text-ink text-right">{remaining.large}</dd>
          <dt>{t('remainingSmall')}</dt><dd className="font-semibold text-ink text-right">{remaining.small}</dd>
        </dl>
      )}
    </div>
  )
}

// Barra flotante del kit (Table Selected.png). Es donde empieza el trabajo con una mesa concreta, así que
// aquí está "Crear pedido": la mesa ya está elegida. "Info de reserva" solo si la mesa tiene alguna; un
// botón que siempre abre una lista vacía no es un botón, es ruido.
export function SelectedTableBar({ name, hasReservation, onClear, onReservations, onDetail, onNewOrder }: {
  name: string; hasReservation: boolean; onClear: () => void; onReservations: () => void; onDetail: () => void; onNewOrder: () => void
}) {
  const t = useTranslations('tables')
  return (
    <div role="toolbar" aria-label={t('selected.label')} className="absolute left-1/2 -translate-x-1/2 bottom-8 z-20 h-14 pl-4 pr-1.5 rounded-md bg-overlay text-[#F7F7F7] shadow-xl flex items-center gap-3 whitespace-nowrap">
      <span className="text-[15px] font-semibold">{t('selected.label')}</span>
      <span className="h-11 pl-3 pr-1.5 rounded-sm bg-[#F7F7F7] text-[#0F172A] flex items-center gap-1 text-[15px] font-semibold">
        {t('table', { name })}
        <button type="button" onClick={onClear} aria-label={t('selected.clear')} className="w-8 h-8 grid place-items-center rounded-sm hover:bg-black/10"><Icon name="close" size={18} /></button>
      </span>
      <span aria-hidden className="w-px h-6 bg-[#51525C]" />
      {hasReservation && (
        <button type="button" onClick={onReservations} className="h-11 px-3.5 rounded-sm bg-[#F7F7F7] text-[#0F172A] flex items-center gap-2 text-[15px] font-semibold"><Icon name="reservations" size={20} />{t('selected.reservation')}</button>
      )}
      <button type="button" onClick={onDetail} className="h-11 px-3.5 rounded-sm bg-[#F7F7F7] text-[#0F172A] flex items-center gap-2 text-[15px] font-semibold"><Icon name="tables" size={20} />{t('selected.detail')}</button>
      <button type="button" onClick={onNewOrder} className="h-11 px-3.5 rounded-sm bg-primary text-primary-ink flex items-center gap-2 text-[15px] font-semibold"><Icon name="plus" size={20} />{t('createOrder')}</button>
    </div>
  )
}
