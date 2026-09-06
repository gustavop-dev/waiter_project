'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'

import { Icon, type KitIcon } from '@/components/kit/Icon'
import { initials } from '@/components/layout/Sidebar'
import { TAB_ROUTES, adminSubtabsFor, tabsFor, type AdminSubtab, type KitTab } from '@/lib/domain/navigation'
import type { Role } from '@/lib/domain/roles'
import { cn } from '@/lib/utils'

const ICON: Record<KitTab, KitIcon> = { dashboard: 'dashboard', orders: 'orders', tables: 'tables', reservations: 'reservations', history: 'history', inventory: 'inventory', kitchen: 'kitchen', admin: 'admin' }

// Barra superior del kit (Dashboard / Filled.png): logo, pestañas en píldora gris, campana con punto, chip de usuario.
export function TopBar({ active, role, userName, unread = 0, activeSubtab, onOpenSettings }: { active: KitTab | null; role: Role; userName: string; unread?: number; activeSubtab?: AdminSubtab | null; onOpenSettings: () => void }) {
  const t = useTranslations('pos.kit.nav')
  const tr = useTranslations('pos.nav.roles')
  const tabs = tabsFor(role)
  const subtabs = adminSubtabsFor(role)
  return (
    <header className="shrink-0 bg-surface border-b border-border">
      <div className="h-topbar px-6 flex items-center gap-6">
        <Link href="/dashboard" aria-label="Waiter" className="w-9 h-9 rounded-md bg-primary text-primary-ink grid place-items-center font-semibold">W</Link>
        <nav aria-label={t('main')} className="flex items-center gap-1 p-1 rounded-lg bg-muted">
          {tabs.map((tab) => (
            <Link key={tab} href={TAB_ROUTES[tab]} aria-current={tab === active ? 'page' : undefined}
              className={cn('flex items-center gap-2 h-11 px-4 rounded-md text-[16px] font-semibold', tab === active ? 'bg-surface border border-border text-ink' : 'text-dim hover:text-soft')}>
              <Icon name={ICON[tab]} size={20} /><span>{t(tab)}</span>
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <button type="button" aria-label={t('bell', { count: unread })} className="relative w-12 h-12 rounded-md border border-border grid place-items-center text-soft">
            <Icon name="bell" size={22} />
            {unread > 0 && <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 rounded-full bg-danger border-2 border-surface" />}
          </button>
          <button type="button" onClick={onOpenSettings} className="h-12 pl-1.5 pr-4 rounded-md border border-border flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-full bg-primary-soft text-primary grid place-items-center text-[14px] font-semibold">{initials(userName)}</span>
            <span className="text-[15px] text-ink font-semibold">{userName}<span className="text-dim font-normal"> / {tr(role)}</span></span>
          </button>
        </div>
      </div>
      {active === 'admin' && subtabs.length > 0 && (
        <nav aria-label={t('adminRow')} className="h-14 px-6 flex items-center gap-2 border-t border-border">
          {subtabs.map(([key, href]) => (
            <Link key={key} href={href} aria-current={key === activeSubtab ? 'page' : undefined}
              className={cn('h-10 px-4 rounded-md border text-[15px] font-semibold inline-flex items-center', key === activeSubtab ? 'bg-primary-soft border-primary/40 text-primary' : 'bg-surface border-border text-soft')}>{t(`sub.${key}`)}</Link>
          ))}
        </nav>
      )}
    </header>
  )
}
