'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useRef } from 'react'

import { Icon } from '@/components/kit/Icon'
import { Toggle } from '@/components/kit/Toggle'
import { parseFloorName } from '@/lib/domain/tablesKit'
import type { FloorSetting } from '@/lib/services/tables'

interface Props { open: boolean; onClose: () => void; floors: FloorSetting[]; onAdd: () => void; onEdit: (floor: FloorSetting) => void; onToggle: (floor: FloorSetting, active: boolean) => void }

// Popover del engranaje (Table Setting/Dropdown.png): "+ Agregar piso" y la lista de pisos con lápiz y toggle activo.
export function FloorSettingsPopover({ open, onClose, floors, onAdd, onEdit, onToggle }: Props) {
  const t = useTranslations('tables.floorSettings')
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) onClose() }
    window.addEventListener('pointerdown', close)
    return () => window.removeEventListener('pointerdown', close)
  }, [open, onClose])
  if (!open) return null
  return (
    <div ref={ref} role="dialog" aria-label={t('add')} className="absolute right-4 top-2 z-30 w-[236px] p-3 rounded-md bg-surface border border-border shadow-xl flex flex-col gap-2">
      <button type="button" onClick={onAdd} className="h-10 rounded-sm border border-border flex items-center justify-center gap-2 text-[15px] font-semibold text-soft hover:bg-muted"><Icon name="plus" size={18} />{t('add')}</button>
      {floors.length === 0 ? <p className="py-2 text-center text-[13px] text-dim">{t('empty')}</p> : (
        <ul className="flex flex-col">
          {floors.map((f) => {
            const label = parseFloorName(f.name).label
            return (
              <li key={f.id} className="h-12 flex items-center gap-2">
                <button type="button" aria-label={t('edit', { name: label })} onClick={() => onEdit(f)} className="w-9 h-9 rounded-sm grid place-items-center text-soft hover:bg-muted"><Icon name="edit" size={20} /></button>
                <span className="flex-1 min-w-0 truncate text-[15px] font-semibold text-ink">{label}</span>
                <Toggle checked={f.active} onChange={(v) => onToggle(f, v)} label={t('active', { name: label })} />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
