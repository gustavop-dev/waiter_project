'use client'

import { NextIntlClientProvider } from 'next-intl'

import { Toaster } from '@/components/kit/Toaster'

import messages from '@/lib/i18n/messages/es.json'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider locale="es" messages={messages} timeZone="America/Bogota">
      {children}
      <Toaster />
    </NextIntlClientProvider>
  )
}
