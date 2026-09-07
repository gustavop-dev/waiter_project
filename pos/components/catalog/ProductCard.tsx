'use client'

import { useTranslations } from 'next-intl'

import { Icon } from '@/components/kit/Icon'
import { StatusPill } from '@/components/kit/StatusPill'
import { formatCop } from '@/lib/domain/money'
import type { AdminProduct } from '@/lib/services/catalogAdmin'
import { cn } from '@/lib/utils'

interface ProductCardProps { product: AdminProduct; categoryNames: string; taxName: string | null; selected: boolean; onClick: () => void }

// Tarjeta de plato del kit (Inventory / Menu List / Home.png): foto con píldora de estado, nombre, categoría y pie con dato.
export function ProductCard({ product, categoryNames, taxName, selected, onClick }: ProductCardProps) {
  const t = useTranslations('admin.catalog.card')
  return (
    <button type="button" onClick={onClick} aria-pressed={selected}
      className={cn('bg-surface border rounded-lg overflow-hidden flex flex-col text-left hover:border-primary/60', selected ? 'border-primary' : 'border-border')}>
      <div className="relative aspect-[4/3] bg-muted grid place-items-center text-dim">
        {product.hasImage
          // eslint-disable-next-line @next/next/no-img-element -- foto servida por Odoo a través del proxy same-origin.
          ? <img src={`/odoo/web/image/product.template/${product.id}/image_512`} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
          : <Icon name="photo" size={36} />}
        <StatusPill tone={product.available ? 'success' : 'neutral'} className="absolute top-2 left-2 h-7 text-[13px]">{product.available ? t('available') : t('hidden')}</StatusPill>
        {product.favorite && <span className="absolute top-2 right-2 w-8 h-8 rounded-sm bg-surface text-progress grid place-items-center"><Icon name="starFilled" size={18} label={t('favorite')} /></span>}
      </div>
      <div className="p-3 flex flex-col gap-0.5"><span className="text-[16px] font-semibold text-ink leading-tight">{product.name}</span><span className="text-[13px] text-soft">{categoryNames}</span></div>
      <div className="mt-auto px-3 h-11 border-t border-border flex items-center justify-between text-[13px] text-soft">
        <span className="text-[16px] font-semibold text-ink tabular">$ {formatCop(product.price)}</span>
        <span>{taxName ?? t('noTax')}</span>
      </div>
    </button>
  )
}
