'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { allowedPath } from '@/lib/domain/roles'
import { useAuthStore } from '@/lib/stores/authStore'
import { useCatalogStore } from '@/lib/stores/catalogStore'

export default function PosLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, session, employee, hydrated, hydrate } = useAuthStore()
  const load = useCatalogStore((s) => s.load)

  useEffect(() => { void hydrate() }, [hydrate])
  // PWA: registro del service worker (no hace nada más que permitir la instalación).
  useEffect(() => { if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js').catch(() => undefined) }, [])
  useEffect(() => {
    if (!hydrated) return
    // Sin usuario: login. Con usuario pero sin caja abierta: abrir caja (no es un error, es el inicio del turno).
    if (!user) { router.replace('/login'); return }
    // Con sesión de Odoo pero sin empleado activo (pos_hr): al "Inicio de empleado" a elegir cuenta y PIN.
    if (!employee) { router.replace('/login'); return }
    if (!session) { router.replace('/caja'); return }
    // Rol: una pantalla que no le toca lo devuelve al salón, sin pantalla de error.
    if (!allowedPath(user.role, pathname)) { router.replace('/salon'); return }
    void load(session.id)
  }, [hydrated, user, employee, session, pathname, router, load])

  if (!hydrated || !session || !user || !employee || !allowedPath(user.role, pathname)) return null
  return <>{children}</>
}
