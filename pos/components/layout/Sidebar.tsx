'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'

import { cn } from '@/lib/utils'

const ITEMS = ['operation', 'sales', 'catalog', 'inventory', 'customers', 'automation', 'billing', 'settings'] as const
type Item = (typeof ITEMS)[number]
const ROUTES: Partial<Record<Item, string>> = { operation: '/salon' }

export function Sidebar({ active }: { active: Item }) {
  const t = useTranslations('pos')
  const itemClass = 'flex items-center justify-between h-12 px-3 rounded-[10px] text-base'
  return (
    <aside className="w-sidebar shrink-0 bg-sidebar text-sidebar-soft p-5 flex flex-col gap-5">
      <div className="flex items-center gap-2.5 px-2">
        <span className="h-[30px] px-2 rounded-sm bg-brand-500 grid place-items-center font-display text-lg text-ink">Wt.</span>
        <span className="font-display text-xl text-sidebar-ink">{t('brand')}<span className="text-brand-500">.</span></span>
      </div>
      <nav className="flex flex-col gap-0.5">
        {ITEMS.map((item) => {
          const href = ROUTES[item]
          if (href) {
            return (
              <Link key={item} href={href} className={cn(itemClass, item === active ? 'bg-brand-500 text-ink font-semibold' : 'hover:bg-sidebar-hover hover:text-sidebar-ink')}>
                {t(`nav.${item}`)}
              </Link>
            )
          }
          return (
            <button key={item} type="button" disabled title={t('nav.soon')} className={cn(itemClass, 'opacity-60 cursor-not-allowed')}>
              {t(`nav.${item}`)}
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
