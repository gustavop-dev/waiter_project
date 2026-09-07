'use client'

import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

import { DashboardMockup } from '@/components/account/DashboardMockup'

// Composición del kit para el acceso (1 – Authentication, 2 – Forgot PIN): logo arriba a la izquierda,
// columna de 440 px con el contenido y la tablet decorativa a la derecha, recortada por el borde.
export function LoginFrame({ children }: { children: ReactNode }) {
  const t = useTranslations('account')
  return (
    <main className="h-screen overflow-hidden flex bg-surface text-ink">
      <section className="w-[600px] shrink-0 pl-7 pr-12 pt-12 flex flex-col">
        <div className="flex items-center gap-3 pl-1">
          <span className="w-9 h-9 rounded-md bg-primary text-primary-ink grid place-items-center text-[17px] font-semibold">W</span>
          <span className="text-[24px] font-semibold tracking-[-0.01em] text-ink">{t('brand')}</span>
        </div>
        <div className="flex-1 min-h-0 pl-[52px] pt-6 flex flex-col">{children}</div>
      </section>
      <aside className="flex-1 min-w-0 pt-10">
        <DashboardMockup />
      </aside>
    </main>
  )
}
