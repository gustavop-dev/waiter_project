'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'

import { SettingsModal } from '@/components/kit/SettingsModal'
import { TopBar } from '@/components/kit/TopBar'
import { adminSubtabForPath, tabForPath } from '@/lib/domain/navigation'
import { useAuthStore } from '@/lib/stores/authStore'
import { useCatalogStore } from '@/lib/stores/catalogStore'

// Armazón del kit: barra superior por rol, contenido sobre el lienzo y el modal de ajustes.
export function KitShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const restaurant = useCatalogStore((s) => s.catalog?.company.name ?? '')
  const [settings, setSettings] = useState(false)
  const role = user?.role ?? 'waiter'
  return (
    <div className="h-screen flex flex-col bg-canvas text-ink">
      <TopBar active={tabForPath(pathname)} role={role} userName={user?.name ?? ''} activeSubtab={adminSubtabForPath(pathname)} onOpenSettings={() => setSettings(true)} />
      <div className="flex-1 min-h-0 flex flex-col">{children}</div>
      <SettingsModal open={settings} onClose={() => setSettings(false)} user={{ name: user?.name ?? '', role }} restaurant={restaurant}
        onLogout={async () => { await logout(); router.replace('/login') }} />
    </div>
  )
}
