'use client'

import { useTranslations } from 'next-intl'

import { Icon } from '@/components/kit/Icon'
import { templateImage } from '@/components/orders/format'
import { formatCop } from '@/lib/domain/money'
import type { Product } from '@/lib/types'
import { cn } from '@/lib/utils'

// Tarjeta de plato del kit (8 – Add New Order): foto con badge Disponible / No disponible, nombre, precio y "Agregar" / "Agregar más (n)".
// Un plato agotado muestra "Disponible: Sin hora" hasta que exista `available_from` en Odoo.
export function MenuProductCard({ product, inCart, onAdd }: { product: Product; inCart: number; onAdd: () => void }) {
  const t = useTranslations('orders.addRound')
  return (
    <article aria-label={product.name} className="rounded-md border border-border bg-surface p-2 flex flex-col gap-2">
      <div className="relative h-[120px] rounded-sm bg-muted overflow-hidden grid place-items-center text-dim">
        {product.hasImage ? <img src={templateImage(product.templateId)} alt="" className="absolute inset-0 w-full h-full object-cover" /> : <Icon name="photo" size={26} />}
        <span className="absolute top-2 left-2 h-7 pl-2 pr-2.5 rounded-full bg-surface text-[12px] font-semibold text-ink inline-flex items-center gap-1.5">
          <span className={cn('w-2 h-2 rounded-full', product.soldOut ? 'bg-danger' : 'bg-success')} />{product.soldOut ? t('unavailable') : t('available')}
        </span>
      </div>
      <span className="text-[14px] font-semibold text-ink truncate">{product.name}</span>
      {product.soldOut
        ? <span className="h-10 rounded-sm bg-muted text-[13px] font-semibold text-ink inline-flex items-center justify-center gap-1.5"><Icon name="mail" size={16} />{t('availableOn', { time: t('noTime') })}</span>
        : <div className="flex items-center justify-between gap-2">
          <span className="text-[16px] font-semibold text-primary tabular"><sup className="text-[11px] mr-0.5">$</sup>{formatCop(product.price)}</span>
          <button type="button" onClick={onAdd} className={cn('h-9 px-3 rounded-sm border text-[13px] font-semibold', inCart > 0 ? 'border-primary/40 bg-primary-soft text-primary' : 'border-border bg-surface text-ink')}>
            {inCart > 0 ? t('addMore', { n: inCart }) : t('add')}
          </button>
        </div>}
    </article>
  )
}
