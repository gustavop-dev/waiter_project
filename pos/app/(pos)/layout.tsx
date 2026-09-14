'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { administrationPath } from '@/lib/domain/navigation'
import { Button } from '@/components/ui/Button'
import { allowedPath, effectiveRole } from '@/lib/domain/roles'
import { useAuthStore } from '@/lib/stores/authStore'
import { useCatalogStore } from '@/lib/stores/catalogStore'

export default function PosLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, session, employee, hydrated, hydrate } = useAuthStore()
  const load = useCatalogStore((s) => s.load)
  const catalogStatus = useCatalogStore((s) => s.status)
  const catalogError = useCatalogStore((s) => s.error)

  useEffect(() => { void hydrate() }, [hydrate])
  // PWA: registro del service worker (no hace nada más que permitir la instalación).
  useEffect(() => { if ('serviceWorker' in navigator) void navigator.serviceWorker.register('/sw.js').catch(() => undefined) }, [])
  useEffect(() => {
    if (!hydrated) return
    // Sin usuario: login. Con usuario pero sin caja abierta: abrir caja (no es un error, es el inicio del turno).
    if (!user) { router.replace('/login'); return }
    // Con sesión de Odoo pero sin empleado activo (pos_hr): al "Inicio de empleado" a elegir cuenta y PIN.
    if (!employee) { router.replace('/login'); return }
    if (!session && (effectiveRole(user.role, employee.role) !== 'admin' || !administrationPath(pathname))) { router.replace('/caja'); return }
    // Rol: una pantalla que no le toca lo devuelve al salón, sin pantalla de error.
    if (!allowedPath(effectiveRole(user.role, employee.role), pathname)) { router.replace('/salon'); return }
    void load(session?.id ?? null)
  }, [hydrated, user, employee, session, pathname, router, load])

  if (!hydrated || !user || !employee || (!session && (effectiveRole(user.role, employee.role) !== 'admin' || !administrationPath(pathname))) || !allowedPath(effectiveRole(user.role, employee.role), pathname)) return null
  // Sin catálogo no hay pantalla que pintar: se dice por qué en vez de dejar el POS en blanco.
  if (catalogStatus === 'error') {
    return (
      <main className="h-screen grid place-items-center bg-canvas p-8">
        <div role="alert" className="max-w-lg text-center flex flex-col gap-3">
          <span className="text-[20px] font-semibold text-ink">No se pudo cargar la carta</span>
          <p className="text-[15px] text-soft">Odoo rechazó los datos de este terminal. Avisa a quien administra el punto de venta.</p>
          {catalogError && <p className="text-[13px] text-dim font-mono break-words">{catalogError}</p>}
          <Button variant="primary" className="self-center mt-2" onClick={() => { void load(session?.id ?? null) }}>Reintentar</Button>
        </div>
      </main>
    )
  }
  return <>{children}</>
}
