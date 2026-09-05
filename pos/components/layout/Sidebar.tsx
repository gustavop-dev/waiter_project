'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'

import { Money } from '@/components/ui/Money'
import type { ShiftSummary } from '@/lib/services/orders'
import { cn } from '@/lib/utils'

export const NAV_ITEMS = ['operation', 'sales', 'catalog', 'inventory', 'customers', 'automation', 'billing', 'settings'] as const
export type NavItem = (typeof NAV_ITEMS)[number]
export const ROUTES: Record<NavItem, string> = {
  operation: '/salon', sales: '/ventas', catalog: '/catalogo', inventory: '/inventario', customers: '/clientes',
  automation: '/automatizacion', billing: '/facturacion', settings: '/configuracion',
}
export interface NavBadge { count: number; tone: 'brand' | 'warn' | 'busy' }
export interface SubNavItem { key: string; label: string; href: string; active?: boolean }
export interface Autonomy { autonomous: number; total: number }

const BADGE = { brand: 'bg-sidebar text-brand-500', warn: 'bg-pending text-ink', busy: 'bg-busy text-white' }

export function initials(name: string): string {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase()
}

interface Props {
  active: NavItem; restaurant?: string; shift?: ShiftSummary | null; userName?: string
  badges?: Partial<Record<NavItem, NavBadge>>; subnav?: { label: string; items: SubNavItem[] }; autonomy?: Autonomy | null
}

export function Sidebar({ active, restaurant = '', shift = null, userName = '', badges = {}, subnav, autonomy = null }: Props) {
  const t = useTranslations('pos')
  const itemClass = 'flex items-center justify-between h-12 px-3 rounded-[10px] text-base'
  return (
    <aside className="w-sidebar shrink-0 bg-sidebar text-sidebar-soft p-3.5 pt-5 flex flex-col gap-5">
      <div className="flex items-center gap-2.5 px-2">
        <span className="h-[30px] px-2 rounded-sm bg-brand-500 grid place-items-center font-bold text-[17px] tracking-[-0.05em] text-ink">Wt.</span>
        <div className="flex flex-col leading-[1.15]">
          <span className="font-bold text-[19px] tracking-[-0.03em] text-sidebar-ink">{t('brand')}<span className="text-brand-500">.</span></span>
          <span className="text-[11px] tracking-[0.1em] uppercase text-sidebar-dim">{restaurant || t('nav.byProjectApp')}</span>
        </div>
      </div>
      <nav className="flex flex-col gap-[3px]">
        {NAV_ITEMS.map((item) => {
          const badge = badges[item]
          return (
            <Link key={item} href={ROUTES[item]} className={cn(itemClass, item === active ? 'bg-brand-500 text-ink font-bold' : 'hover:bg-sidebar-hover hover:text-sidebar-ink')}>
              <span>{t(`nav.${item}`)}</span>
              {badge && badge.count > 0 && <span className={cn('min-w-6 h-6 px-[7px] rounded-full grid place-items-center text-[13px] font-bold', item === active && badge.tone === 'brand' ? 'bg-sidebar text-brand-500' : BADGE[badge.tone])}>{badge.count}</span>}
            </Link>
          )
        })}
      </nav>
      {subnav && (
        <nav aria-label={subnav.label} className="flex flex-col gap-[3px] border-t border-kds-raised pt-3">
          <span className="px-3 pb-2 text-xs tracking-[0.12em] uppercase text-sidebar-dim font-medium">{subnav.label}</span>
          {subnav.items.map((s) => (
            <Link key={s.key} href={s.href} className={cn('flex items-center h-11 px-3 rounded-[10px] text-[15px]', s.active ? 'bg-sidebar-hover text-sidebar-ink' : 'hover:text-sidebar-ink')}>{s.label}</Link>
          ))}
        </nav>
      )}
      <div className="mt-auto flex flex-col gap-3">
        {autonomy ? (
          <div className="p-3.5 rounded-xl bg-sidebar-raised flex flex-col gap-1.5">
            <span className="text-xs tracking-[0.1em] uppercase text-sidebar-dim font-medium">{t('nav.noHuman')}</span>
            <span className="font-mono tabular text-2xl text-sidebar-ink">{autonomy.total ? Math.round((autonomy.autonomous / autonomy.total) * 100) : 0}%</span>
            <span className="text-[13px] text-[#8F877D]">{t('nav.noHumanMeta', { autonomous: autonomy.autonomous, total: autonomy.total })}</span>
          </div>
        ) : shift && (
          <div className="p-3.5 rounded-xl bg-sidebar-raised flex flex-col gap-1.5">
            <span className="text-xs tracking-[0.1em] uppercase text-sidebar-dim font-medium">{t('nav.shift')}</span>
            <Money amount={shift.sales} withSymbol className="text-2xl text-sidebar-ink" />
            <span className="text-[13px] text-[#8F877D]">{t('nav.shiftMeta', { orders: shift.orders, waiters: shift.waiters })}</span>
          </div>
        )}
        {userName && (
          <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] bg-sidebar-raised">
            <span className="w-[34px] h-[34px] rounded-full bg-[#3A342E] text-sidebar-ink grid place-items-center text-sm font-medium">{initials(userName)}</span>
            <div className="flex flex-col leading-tight"><span className="text-[15px] text-sidebar-ink">{userName}</span><span className="text-[13px] text-sidebar-dim">{t('nav.role')}</span></div>
          </div>
        )}
      </div>
    </aside>
  )
}
