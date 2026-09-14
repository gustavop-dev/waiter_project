'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useRef } from 'react'

import { Icon } from '@/components/kit/Icon'
import { Toggle } from '@/components/kit/Toggle'
import { parseFloorName } from '@/lib/domain/tablesKit'
import type { FloorSetting } from '@/lib/services/tables'

interface Props { open: boolean; onClose: () => void; floors: FloorSetting[]; currentFloor?: FloorSetting | null; onAdd: () => void; onEdit: (floor: FloorSetting) => void; onToggle: (floor: FloorSetting, active: boolean) => void }

// Popover del engranaje (Table Setting/Dropdown.png): "+ Agregar piso" y la lista de pisos con lápiz y toggle activo.
export function FloorSettingsPopover({ open, onClose, floors, currentFloor, onAdd, onEdit, onToggle }: Props) {
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
    <div ref={ref} role="dialog" aria-label={t('add')} className="absolute right-4 top-2 z-30 w-[300px] max-w-[calc(100vw-2rem)] p-3 rounded-md bg-surface border border-border shadow-xl flex flex-col gap-2">
      {currentFloor && <button type="button" onClick={() => onEdit(currentFloor)} className="min-h-14 p-3 rounded-sm border border-primary/30 bg-primary-soft flex items-center gap-3 text-left text-primary">
        <Icon name="edit" size={20} />
        <span className="min-w-0 flex flex-col"><span className="text-[15px] font-semibold">{t('editCurrent')}</span><span className="truncate text-[13px]">{parseFloorName(currentFloor.name).label}</span></span>
      </button>}
      <button type="button" onClick={onAdd} className="h-10 rounded-sm border border-border flex items-center justify-center gap-2 text-[15px] font-semibold text-soft hover:bg-muted"><Icon name="plus" size={18} />{t('add')}</button>
      {floors.length === 0 ? (currentFloor ? null : <p className="py-2 text-center text-[13px] text-dim">{t('empty')}</p>) : (
        <ul className="flex flex-col">
          {floors.map((f) => {
            const label = parseFloorName(f.name).label
            return (
              <li key={f.id} className="h-12 flex items-center gap-2">
                <button type="button" aria-label={t('edit', { name: label })} onClick={() => onEdit(f)} className="flex-1 min-w-0 h-10 px-2 rounded-sm flex items-center gap-2 text-left text-soft hover:bg-muted"><Icon name="edit" size={18} /><span className="truncate text-[14px] font-semibold">{t('edit', { name: label })}</span></button>
                <Toggle checked={f.active} onChange={(v) => onToggle(f, v)} label={t('active', { name: label })} />
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
