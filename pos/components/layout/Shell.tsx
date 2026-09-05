'use client'

import type { ReactNode } from 'react'

import { Rail } from '@/components/layout/Rail'
import { Sidebar, type Autonomy, type NavBadge, type NavItem, type SubNavItem } from '@/components/layout/Sidebar'
import { useAuthStore } from '@/lib/stores/authStore'
import { useCatalogStore } from '@/lib/stores/catalogStore'
import { useOrderStore } from '@/lib/stores/orderStore'

interface ShellProps {
  mode: 'sidebar' | 'rail'; active?: NavItem; children: ReactNode
  badges?: Partial<Record<NavItem, NavBadge>>; subnav?: { label: string; items: SubNavItem[] }; autonomy?: Autonomy | null
}

export function Shell({ mode, active = 'operation', badges, subnav, autonomy, children }: ShellProps) {
  const userName = useAuthStore((s) => s.user?.name ?? '')
  const role = useAuthStore((s) => s.user?.role ?? 'waiter')
  const restaurant = useCatalogStore((s) => s.catalog?.company.name ?? '')
  const shift = useOrderStore((s) => s.shift)
  return (
    <div className="h-screen flex bg-canvas">
      {mode === 'sidebar'
        ? <Sidebar active={active} restaurant={restaurant} shift={shift} userName={userName} badges={badges} subnav={subnav} autonomy={autonomy} role={role} />
        : <Rail active="tables" userName={userName} role={role} />}
      <div className="flex-1 min-w-0 flex flex-col">{children}</div>
    </div>
  )
}
