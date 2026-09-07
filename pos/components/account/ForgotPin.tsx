'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Icon } from '@/components/kit/Icon'
import { Button } from '@/components/ui/Button'

export const LOGIN_INPUT = 'w-full h-12 px-4 rounded-md border border-border bg-surface text-[16px] text-ink placeholder:text-dim focus:outline-none focus:border-primary'

// "Forgot PIN?" y "Check your email" del kit (2 – Forgot PIN/Home.png y Check Email.png).
// Hoy pide el código por /waiter/auth/request_code; el reenvío del PIN real llega con el backend (informe).
export function ForgotPin({ initialEmail = '', onRequest, onBack }: { initialEmail?: string; onRequest: (email: string) => Promise<void>; onBack: () => void }) {
  const t = useTranslations('account.forgot')
  const [email, setEmail] = useState(initialEmail)
  const [sent, setSent] = useState(false)
  const [resent, setResent] = useState(false)
  const [busy, setBusy] = useState(false)

  async function request(again: boolean) {
    setBusy(true)
    try { await onRequest(email.trim()); setSent(true); setResent(again) } finally { setBusy(false) }
  }

  return (
    <div className="w-[440px] pt-[72px] flex flex-col">
      <span className="w-10 h-10 rounded-md border border-border grid place-items-center text-ink shadow-sm"><Icon name={sent ? 'mail' : 'fingerprint'} size={22} /></span>
      {sent ? (
        <>
          <h1 className="mt-8 text-[24px] font-semibold text-ink">{t('checkTitle')}</h1>
          <p className="mt-1 text-[16px] text-dim">{t('checkBody')} <span className="font-semibold text-ink">{email.trim()}</span></p>
          <p className="mt-6 text-[16px] text-dim">{t('notReceived')} <button type="button" disabled={busy} onClick={() => void request(true)} className="font-semibold text-primary">{t('resend')}</button></p>
          {resent && <p role="status" className="mt-2 text-[14px] text-success-ink">{t('resent')}</p>}
        </>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); void request(false) }} className="flex flex-col">
          <h1 className="mt-8 text-[24px] font-semibold text-ink">{t('title')}</h1>
          <p className="mt-1 text-[16px] text-dim">{t('subtitle')}</p>
          <label className="mt-8 flex flex-col gap-2 text-[16px] font-medium text-ink">{t('email')}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('placeholder')} autoComplete="username" className={LOGIN_INPUT} />
          </label>
          <Button type="submit" variant="primary" className="mt-6 w-full h-12 text-[17px] font-semibold" disabled={busy || !email.includes('@')}>{t('submit')}</Button>
        </form>
      )}
      <button type="button" onClick={onBack} className="mt-8 self-center text-[16px] font-semibold text-ink">{t('back')}</button>
    </div>
  )
}
