'use client'

import { useTranslations } from 'next-intl'
import type { ReactNode } from 'react'

// Acceso (1 – Authentication, 2 – Forgot PIN) en una sola columna centrada: el kit pone una tablet
// decorativa a la derecha, pero en el terminal real no aporta nada y se quitó por decisión del usuario.
export function LoginFrame({ children }: { children: ReactNode }) {
  const t = useTranslations('account')
  return (
    <main className="h-screen overflow-hidden flex flex-col items-center bg-surface text-ink">
      <div className="w-full max-w-[520px] px-6 pt-14 flex flex-col items-center">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-md bg-primary text-primary-ink grid place-items-center text-[17px] font-semibold">W</span>
          <span className="text-[24px] font-semibold tracking-[-0.01em] text-ink">{t('brand')}</span>
        </div>
      </div>
      <div className="flex-1 min-h-0 w-full max-w-[520px] px-6 pt-8 pb-10 overflow-auto flex flex-col items-center">{children}</div>
    </main>
  )
}
