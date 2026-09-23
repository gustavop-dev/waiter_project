'use client'

import { NextIntlClientProvider } from 'next-intl'

import { ThemeBoot } from '@/components/kit/ThemeBoot'
import { Toaster } from '@/components/kit/Toaster'

import { messages } from '@/lib/i18n/messages'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="es" messages={messages} timeZone="America/Bogota">
      <ThemeBoot />
      {children}
      <Toaster />
    </NextIntlClientProvider>
  )
}
