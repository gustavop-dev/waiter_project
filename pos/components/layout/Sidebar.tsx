'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'

import { Money } from '@/components/ui/Money'
import type { ShiftSummary } from '@/lib/services/orders'
import { cn } from '@/lib/utils'

const ITEMS = ['operation', 'sales', 'catalog', 'inventory', 'customers', 'automation', 'billing', 'settings'] as const
type Item = (typeof ITEMS)[number]
const ROUTES: Partial<Record<Item, string>> = { operation: '/salon' }

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

interface Props { active: Item; restaurant?: string; shift?: ShiftSummary | null; userName?: string }

export function Sidebar({ active, restaurant = '', shift = null, userName = '' }: Props) {
  const t = useTranslations('pos')
  const itemClass = 'flex items-center justify-between h-12 px-3 rounded-[10px] text-base'
  return (
    <aside className="w-sidebar shrink-0 bg-sidebar text-sidebar-soft p-5 flex flex-col gap-5">
      <div className="flex items-center gap-2.5 px-2">
        <span className="h-[30px] px-2 rounded-sm bg-brand-500 grid place-items-center font-display text-lg text-ink">Wt.</span>
        <div className="flex flex-col leading-tight">
          <span className="font-display text-xl text-sidebar-ink">{t('brand')}<span className="text-brand-500">.</span></span>
          {restaurant && <span className="text-[11px] tracking-[0.1em] uppercase text-sidebar-dim">{restaurant}</span>}
        </div>
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
      <div className="mt-auto flex flex-col gap-2.5">
        {shift && (
          <div className="p-3.5 rounded-md bg-sidebar-raised flex flex-col gap-1.5">
            <span className="text-xs tracking-[0.1em] uppercase text-sidebar-dim font-semibold">{t('nav.shift')}</span>
            <Money amount={shift.sales} withSymbol className="text-xl text-sidebar-ink" />
            <span className="text-[13px] text-[#8F877D]">{t('nav.shiftMeta', { orders: shift.orders, waiters: shift.waiters })}</span>
          </div>
        )}
        {userName && (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] bg-sidebar-raised">
            <span className="w-[34px] h-[34px] rounded-full bg-[#3A342E] text-sidebar-ink grid place-items-center text-sm font-semibold">{initials(userName)}</span>
            <div className="flex flex-col leading-tight"><span className="text-[15px] text-sidebar-ink">{userName}</span><span className="text-[13px] text-sidebar-dim">{t('nav.role')}</span></div>
          </div>
        )}
      </div>
    </aside>
  )
}
