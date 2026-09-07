'use client'

import { useTranslations } from 'next-intl'

import { Icon } from '@/components/kit/Icon'
import { KitEmptyState } from '@/components/kit/KitEmptyState'
import { templateImage } from '@/components/orders/format'
import type { Product } from '@/lib/types'

// Panel "Out of Stock" del kit. La hora de reposición ("Available: 03:00 PM") no existe aún en Odoo
// (`product.template.available_from` llega con el addon): mientras tanto se muestra "Sin hora", nunca una hora inventada.
export function OutOfStock({ products }: { products: Product[] }) {
  const t = useTranslations('dashboard')
  const out = products.filter((p) => p.soldOut)
  return (
    <section aria-label={t('outOfStock.title')} className="bg-surface border border-border rounded-lg flex flex-col min-h-0">
      <h2 className="px-4 h-16 flex items-center text-[17px] font-semibold text-ink border-b border-border shrink-0">{t('outOfStock.title')}</h2>
      {out.length === 0
        ? <KitEmptyState icon="inventory" title={t('outOfStock.emptyTitle')} body={t('outOfStock.emptyBody')} />
        : <ul className="flex-1 min-h-0 overflow-y-auto px-4 divide-y divide-border">
          {out.map((p) => (
            <li key={p.id} className="py-3 flex items-center gap-3">
              <span className="w-14 h-14 rounded-sm bg-muted overflow-hidden shrink-0 grid place-items-center text-dim">{p.hasImage ? <img src={templateImage(p.templateId)} alt="" className="w-full h-full object-cover" /> : <Icon name="photo" size={20} />}</span>
              <div className="min-w-0 flex flex-col gap-0.5">
                <span className="text-[15px] font-semibold text-ink truncate">{p.name}</span>
                <span className="text-[14px] text-soft">{t('outOfStock.available')} <b className="text-primary font-semibold">{t('outOfStock.noTime')}</b></span>
              </div>
            </li>
          ))}
        </ul>}
    </section>
  )
}
