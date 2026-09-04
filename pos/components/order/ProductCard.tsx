'use client'

import { useTranslations } from 'next-intl'

import { Money } from '@/components/ui/Money'
import type { Product } from '@/lib/types'

export function ProductCard({ product, onAdd }: { product: Product; onAdd: (p: Product) => void }) {
  const t = useTranslations('pos.order')
  return (
    <button type="button" onClick={() => onAdd(product)} className="h-[214px] border border-border rounded-[14px] bg-surface overflow-hidden flex flex-col text-left active:ring-4 active:ring-brand-50">
      <div className="flex-1 bg-muted grid place-items-center text-xs tracking-[0.08em] uppercase text-ink-3">{t('photo')}</div>
      <div className="px-3.5 py-3 flex flex-col gap-1.5">
        <span className="text-[17px] font-semibold leading-tight">{product.name}</span>
        <Money amount={product.price} className="text-[17px]" />
      </div>
    </button>
  )
}
