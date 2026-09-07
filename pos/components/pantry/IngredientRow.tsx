'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

import { Icon } from '@/components/kit/Icon'
import { StatusPill, type PillTone } from '@/components/kit/StatusPill'
import { IngredientPhoto } from '@/components/pantry/DishDetailModal'
import { LevelBadge } from '@/components/pantry/LevelBadge'
import { categoryEmoji, formatStock, ingredientLevel, ingredientStatus, type Ingredient, type IngredientStatus } from '@/lib/domain/pantry'

const TONE: Record<IngredientStatus, PillTone> = { request: 'danger', normal: 'progress', good: 'success' }

// Fila de "Ingredients List": foto, nombre, categoría • stock • nivel, PROVEEDOR, ESTADO y menú ⋯ (Editar / Solicitar / Eliminar).
export function IngredientRow({ ingredient, onEdit, onRequest, onDelete }: { ingredient: Ingredient; onEdit: () => void; onRequest: () => void; onDelete: () => void }) {
  const t = useTranslations('pantry')
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])
  const level = ingredientLevel(ingredient)
  const status = ingredientStatus(level)
  const pick = (fn: () => void) => () => { setOpen(false); fn() }
  return (
    <li className="h-[72px] px-3 rounded-md border border-border bg-surface flex items-center gap-3">
      <IngredientPhoto ingredient={ingredient} size={48} />
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <p className="text-[15px] font-semibold text-ink truncate">{ingredient.name}</p>
        <p className="text-[13px] text-soft flex items-center gap-1.5 truncate">
          <span>{categoryEmoji(ingredient.categoryName)} {ingredient.categoryName || t('categories.other')}</span><span aria-hidden>•</span>
          <span>{t('ingredients.stock')} {formatStock(ingredient.qty, ingredient.uomName)}</span>
          <LevelBadge level={level} />
        </p>
      </div>
      <span className="w-px h-10 bg-border" aria-hidden />
      <div className="w-[160px] flex flex-col gap-1">
        <span className="text-[12px] font-medium text-dim tracking-wide">{t('ingredients.supplier')}</span>
        <span className="text-[15px] font-semibold text-ink truncate">{ingredient.supplierName ?? t('ingredients.noSupplier')}</span>
      </div>
      <div className="w-[130px] flex flex-col gap-1 items-start">
        <span className="text-[12px] font-medium text-dim tracking-wide">{t('ingredients.status')}</span>
        <StatusPill tone={TONE[status]} className="h-6 px-2 text-[13px]">{t(`ingredients.statusLabel.${status}`)}</StatusPill>
      </div>
      <div ref={box} className="relative">
        <button type="button" aria-label={t('actions.more', { name: ingredient.name })} aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}
          className="w-10 h-10 rounded-md border border-border bg-surface grid place-items-center text-ink hover:bg-muted"><Icon name="moreHorizontal" size={20} /></button>
        {open && (
          <div role="menu" className="absolute right-0 top-full mt-1 z-20 w-[200px] p-1.5 rounded-md border border-border bg-surface shadow-lg flex flex-col">
            <button type="button" role="menuitem" onClick={pick(onEdit)} className="h-10 px-2.5 rounded-sm flex items-center gap-2.5 text-[14px] font-medium text-ink hover:bg-muted"><Icon name="edit" size={18} />{t('actions.edit')}</button>
            <button type="button" role="menuitem" onClick={pick(onRequest)} className="h-10 px-2.5 rounded-sm flex items-center gap-2.5 text-[14px] font-medium text-ink hover:bg-muted"><Icon name="catalog" size={18} />{t('actions.request')}</button>
            <span className="my-1 border-t border-border" aria-hidden />
            <button type="button" role="menuitem" onClick={pick(onDelete)} className="h-10 px-2.5 rounded-sm flex items-center gap-2.5 text-[14px] font-medium text-danger-ink hover:bg-danger-soft"><Icon name="trash" size={18} />{t('actions.delete')}</button>
          </div>
        )}
      </div>
    </li>
  )
}
