'use client'

import { useTranslations } from 'next-intl'

import { Icon } from '@/components/kit/Icon'
import { LevelBadge } from '@/components/pantry/LevelBadge'
import type { DishView } from '@/lib/domain/pantry'
import { cn } from '@/lib/utils'

export const dishImage = (id: number) => `/odoo/web/image/product.template/${id}/image_512`

// Tarjeta del "Menu List": foto con badge Disponible, nombre, categoría y pie "Se pueden servir: N" con nivel.
export function DishCard({ dish, category, onOpen }: { dish: DishView; category: string; onOpen: () => void }) {
  const t = useTranslations('pantry')
  return (
    <button type="button" onClick={onOpen} aria-label={t('detail.open', { name: dish.name })} className="text-left bg-surface border border-border rounded-md p-1.5 flex flex-col hover:border-primary/40">
      <div className="relative aspect-[230/122] rounded-sm overflow-hidden bg-muted grid place-items-center text-dim">
        {dish.hasImage ? <img src={dishImage(dish.id)} alt="" className="absolute inset-0 w-full h-full object-cover" /> : <Icon name="photo" size={28} />}
        <span className={cn('absolute top-2 left-2 h-7 px-2.5 rounded-full bg-surface text-[13px] font-semibold text-ink flex items-center gap-1.5')}>
          <span className={cn('w-2 h-2 rounded-full', dish.available ? 'bg-success' : 'bg-danger')} aria-hidden />{t(dish.available ? 'menu.available' : 'menu.unavailable')}
        </span>
      </div>
      <div className="px-1.5 pt-2.5 pb-2 flex flex-col gap-0.5">
        <p className="text-[15px] font-semibold text-ink truncate">{dish.name}</p>
        <p className="text-[13px] text-soft truncate">{category}</p>
      </div>
      <div className="mt-auto border-t border-border px-1.5 pt-2 pb-1 flex items-center justify-between text-[13px] text-soft">
        {dish.servings === null ? <span>{t('menu.noRecipe')}</span> : <span>{t('menu.canServe')} <b className="text-ink font-semibold">{dish.servings}</b></span>}
        <LevelBadge level={dish.level} />
      </div>
    </button>
  )
}
