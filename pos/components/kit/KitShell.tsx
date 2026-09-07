'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState, type ReactNode } from 'react'

import { SettingsModal } from '@/components/kit/SettingsModal'
import { TopBar } from '@/components/kit/TopBar'
import { adminSubtabForPath, tabForPath } from '@/lib/domain/navigation'
import { useIdentity } from '@/lib/hooks/useIdentity'
import { useAuthStore } from '@/lib/stores/authStore'
import { useCatalogStore } from '@/lib/stores/catalogStore'

// Armazón del kit: barra superior por rol, contenido sobre el lienzo y el modal de ajustes.
// "Cerrar sesión" del modal termina el turno del empleado (pos_hr); la sesión de Odoo del terminal sigue abierta.
export function KitShell({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const endShift = useAuthStore((s) => s.endShift)
  const restaurant = useCatalogStore((s) => s.catalog?.company.name ?? '')
  const [settings, setSettings] = useState(false)
  // Manda el empleado que marcó su PIN, no la credencial con la que se abrió la tablet.
  const { name: shownName, role } = useIdentity()
  return (
    <div className="h-screen flex flex-col bg-canvas text-ink">
      <TopBar active={tabForPath(pathname)} role={role} userName={shownName} activeSubtab={adminSubtabForPath(pathname)} onOpenSettings={() => setSettings(true)} />
      <div className="flex-1 min-h-0 flex flex-col">{children}</div>
      <SettingsModal open={settings} onClose={() => setSettings(false)} user={{ name: shownName, role }} restaurant={restaurant}
        onLogout={async () => { await endShift(); router.replace('/login') }} />
    </div>
  )
}
