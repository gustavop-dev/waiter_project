'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { useAuthStore } from '@/lib/stores/authStore'
import { useCatalogStore } from '@/lib/stores/catalogStore'

export default function PosLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { session, hydrated, hydrate } = useAuthStore()
  const load = useCatalogStore((s) => s.load)

  useEffect(() => { void hydrate() }, [hydrate])
  useEffect(() => {
    if (!hydrated) return
    if (!session) { router.replace('/login'); return }
    void load(session.id)
  }, [hydrated, session, router, load])

  if (!hydrated || !session) return null
  return <>{children}</>
}
