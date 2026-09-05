'use client'

import { useTranslations } from 'next-intl'

import { formatCop } from '@/lib/domain/cart'
import type { Dish } from '@/lib/types'

// Tarjeta de plato del diseño: foto, nombre, descripción, precio mono y ＋ redondo en el color del restaurante.
export function DishCard({ dish, onOpen, onAdd }: { dish: Dish; onOpen: (d: Dish) => void; onAdd: (d: Dish) => void }) {
  const t = useTranslations('diner')
  return (
    <article className="border border-[#EFE9E0] rounded-r bg-surface overflow-hidden flex flex-col">
      <button type="button" onClick={() => onOpen(dish)} className="text-left flex-1 flex flex-col">
        <div className="h-[88px] bg-muted grid place-items-center text-[11px] tracking-[0.08em] uppercase text-ink-3 overflow-hidden">
          {dish.foto ? <img src={dish.foto} alt="" className="w-full h-full object-cover" /> : t('home.photo')}
        </div>
        <div className="px-3 pt-2.5 flex flex-col gap-0.5">
          <span className="text-[15px] font-medium leading-snug">{dish.nombre}</span>
          {dish.descripcion && <span className="text-[13px] text-soft leading-snug line-clamp-2">{dish.descripcion}</span>}
        </div>
      </button>
      <div className="px-3 pb-3 pt-2 flex items-center justify-between">
        <span className="font-mono tabular text-[15px]">{formatCop(dish.precio)}</span>
        {dish.agotado
          ? <span className="text-[12px] font-medium text-busy-ink">{t('common.soldOut')}</span>
          : <button type="button" aria-label={`${t('common.add')}: ${dish.nombre}`} onClick={() => onAdd(dish)} className="w-[34px] h-[34px] rounded-full bg-brand text-brand-ink grid place-items-center text-[17px] leading-none">＋</button>}
      </div>
    </article>
  )
}
