'use client'

import type { ReactNode } from 'react'

import { Rail } from '@/components/layout/Rail'
import { Sidebar } from '@/components/layout/Sidebar'
import { useAuthStore } from '@/lib/stores/authStore'
import { useCatalogStore } from '@/lib/stores/catalogStore'
import { useOrderStore } from '@/lib/stores/orderStore'

export function Shell({ mode, children }: { mode: 'sidebar' | 'rail'; children: ReactNode }) {
  const userName = useAuthStore((s) => s.user?.name ?? '')
  const restaurant = useCatalogStore((s) => s.catalog?.company.name ?? '')
  const shift = useOrderStore((s) => s.shift)
  return (
    <div className="h-screen flex bg-canvas">
      {mode === 'sidebar' ? <Sidebar active="operation" restaurant={restaurant} shift={shift} userName={userName} /> : <Rail active="tables" userName={userName} />}
      <div className="flex-1 min-w-0 flex flex-col">{children}</div>
    </div>
  )
}
