'use client'

import { useTranslations } from 'next-intl'

import type { Brand } from '@/lib/types'

export function BrandHeader({ brand, table }: { brand: Brand; table: number | null }) {
  const t = useTranslations('diner.common')
  return (
    <header className="px-[18px] pt-[18px] flex items-start justify-between gap-3">
      <div className="flex flex-col min-w-0">
        {brand.logo ? <img src={brand.logo} alt={brand.nombre} className="h-8 w-auto object-contain self-start" /> : <span className="font-display text-[25px] leading-tight truncate">{brand.nombre}</span>}
        {brand.lema && <span className="text-[10px] tracking-[0.22em] uppercase text-ink-3 mt-0.5">{brand.lema}</span>}
      </div>
      <span className="inline-flex items-center h-9 px-3 rounded-full bg-surface border border-border text-sm font-medium shrink-0">{table !== null ? t('table', { n: table }) : t('delivery')}</span>
    </header>
  )
}
