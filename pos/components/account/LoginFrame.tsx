'use client'

import type { ReactNode } from 'react'

import { BrandMark } from '@/components/kit/BrandMark'

// Acceso (1 – Authentication, 2 – Forgot PIN) en una sola columna centrada: el kit pone una tablet
// decorativa a la derecha, pero en el terminal real no aporta nada y se quitó por decisión del usuario.
export function LoginFrame({ children }: { children: ReactNode }) {
  return (
    <main className="h-screen overflow-hidden flex flex-col items-center bg-surface text-ink">
      <div className="w-full max-w-[520px] px-6 pt-14 flex flex-col items-center">
        <BrandMark size="lg" className="items-center text-center" />
      </div>
      <div className="flex-1 min-h-0 w-full max-w-[520px] px-6 pt-8 pb-10 overflow-auto flex flex-col items-center">{children}</div>
    </main>
  )
}
