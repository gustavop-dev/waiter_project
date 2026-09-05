'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { activate, requestCode } from '@/lib/services/activation'
import { jsonRpc } from '@/lib/services/odoo'
import { useAuthStore } from '@/lib/stores/authStore'
import { cn } from '@/lib/utils'
import { useStored } from '@/lib/hooks/useStored'

const ROTATE_MS = 8_000
const write = (key: string, value: string) => { try { if (value) localStorage.setItem(key, value); else localStorage.removeItem(key) } catch { /* sin almacenamiento */ } }
const greetingKey = (h: number) => (h < 12 ? 'morning' : h < 19 ? 'afternoon' : 'night')
const INPUT = 'h-14 px-4 rounded-[10px] border border-[#D6CEC1] bg-surface text-[17px] text-ink focus:outline-none focus:border-brand-500 focus:ring-[3px] focus:ring-brand-50'

// Diseño "Waiter Login" 2a, sin la fila de perfiles (decisión del usuario): solo correo y contraseña.
export default function LoginPage() {
  const t = useTranslations('pos.login')
  const router = useRouter()
  const login = useAuthStore((s) => s.login)
  const [mode, setMode] = useState<'password' | 'code'>('password')
  const storedEmail = useStored('waiter.email')
  const [emailEdit, setEmailEdit] = useState<string | null>(null)
  const email = emailEdit ?? storedEmail
  const setEmail = setEmailEdit
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [remember, setRemember] = useState(true)
  const [failed, setFailed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [code, setCode] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [codeState, setCodeState] = useState<'idle' | 'sent' | 'invalid' | 'mismatch'>('idle')
  const [slide, setSlide] = useState(0)
  const [now, setNow] = useState(() => new Date())
  const [online, setOnline] = useState<boolean | null>(null)
  const [odooVersion, setOdooVersion] = useState('19')
  const restaurant = useStored('waiter.restaurant')
  const terminal = useStored('waiter.terminal')

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 30_000)
    const rotate = setInterval(() => setSlide((s) => (s + 1) % 4), ROTATE_MS)
    const ping = () => jsonRpc<{ server_version: string }>('/web/webclient/version_info', {}).then((v) => { setOnline(true); setOdooVersion(v.server_version) }).catch(() => setOnline(false))
    void ping(); const health = setInterval(ping, 30_000)
    return () => { clearInterval(clock); clearInterval(rotate); clearInterval(health) }
  }, [])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFailed(false); setBusy(true)
    try { await login(email.trim(), password); write('waiter.email', remember ? email.trim() : ''); router.push('/salon') } catch { setFailed(true) } finally { setBusy(false) }
  }
  async function onSendCode() { setBusy(true); try { await requestCode(email); setCodeState('sent') } finally { setBusy(false) } }
  async function onActivate(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirm) { setCodeState('mismatch'); return }
    setBusy(true)
    try {
      const ok = await activate(email, code, newPassword)
      if (!ok) { setCodeState('invalid'); return }
      await login(email.trim(), newPassword); write('waiter.email', email.trim()); router.push('/salon')
    } catch { setCodeState('invalid') } finally { setBusy(false) }
  }
  const frases = t.raw('frases') as { frase: string; pie: string }[]
  const date = now.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <main className="min-h-screen flex bg-surface">
      <section aria-hidden className="w-1/2 shrink-0 relative bg-sidebar overflow-hidden">
        {frases.map((_, i) => <div key={i} className={cn('absolute inset-0 bg-cover bg-center transition-opacity duration-1000', slide === i ? 'opacity-100' : 'opacity-0')} style={{ backgroundImage: `url(/login/fondo-${i + 1}.jpg)` }} />)}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(12,10,8,0.90) 0%, rgba(12,10,8,0.40) 46%, rgba(12,10,8,0.22) 100%), linear-gradient(to bottom, rgba(12,10,8,0.62) 0px, rgba(12,10,8,0.28) 130px, rgba(12,10,8,0) 210px)' }} />
        <div className="absolute inset-0 p-11 flex flex-col justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 px-[11px] rounded-[11px] bg-brand-500 grid place-items-center"><span className="text-[22px] font-bold tracking-[-0.05em] text-ink leading-none">Wt.</span></div>
            <div className="flex flex-col leading-[1.15]"><span className="text-[22px] font-bold tracking-[-0.03em] text-sidebar-ink">Waiter<span className="text-brand-500">.</span></span><span className="text-[11px] tracking-[0.12em] uppercase text-[#EDE7DD] font-medium">by ProjectApp</span></div>
          </div>
          <div className="flex flex-col gap-[18px] max-w-[30ch]">
            <span className="text-[46px] font-bold tracking-[-0.03em] leading-[1.06] text-sidebar-ink">{frases[slide].frase}</span>
            <span className="text-[17px] leading-relaxed text-sidebar-soft">{frases[slide].pie}</span>
            <div className="flex gap-[7px] mt-1.5">{frases.map((_, i) => <span key={i} className={cn('h-[5px] rounded-[3px] transition-all', slide === i ? 'w-[26px] bg-brand-500' : 'w-[18px] bg-sidebar-ink/35')} />)}</div>
          </div>
        </div>
      </section>
      <section className="flex-1 min-w-0 flex flex-col px-[72px] py-11">
        <div className="flex items-center justify-between">
          <span className={cn('inline-flex items-center gap-2 h-[34px] px-3 rounded-full text-sm font-medium', online === false ? 'bg-busy-soft text-busy-ink' : 'bg-free-soft text-free-ink')}><span className={cn('w-[7px] h-[7px] rounded-full', online === false ? 'bg-busy' : 'bg-free')} />{terminal ? t('terminal', { name: terminal }) : t('terminalUnknown')}</span>
          <span className="font-mono tabular text-[15px] text-ink-3">{now.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
        </div>
        <div className="my-auto flex flex-col gap-[26px]">
          <div className="flex flex-col gap-2">
            <span className="text-[13px] tracking-[0.12em] uppercase text-ink-3 font-medium">{date}</span>
            <h1 className="text-[40px] font-bold tracking-[-0.03em] leading-[1.08]">{t(`greeting.${greetingKey(now.getHours())}`)}</h1>
            <p className="text-[17px] leading-relaxed text-soft">{restaurant ? t('subtitle', { restaurant }) : t('subtitleNoRestaurant')}</p>
          </div>
          {mode === 'password' ? (
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <label className="flex flex-col gap-[7px]"><span className="text-[15px] font-medium">{t('email')}</span>
                <input aria-label={t('email')} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" className={INPUT} /></label>
              <label className="flex flex-col gap-[7px]">
                <span className="flex items-baseline justify-between"><span className="text-[15px] font-medium">{t('password')}</span><button type="button" aria-label={t('forgot')} onClick={() => { setMode('code'); setCodeState('idle') }} className="text-sm font-medium text-brand-600">{t('forgot')}</button></span>
                <span className="flex items-center h-14 rounded-[10px] border border-[#D6CEC1] bg-surface overflow-hidden focus-within:border-brand-500 focus-within:ring-[3px] focus-within:ring-brand-50">
                  <input aria-label={t('password')} type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="flex-1 h-full px-4 text-[17px] bg-transparent focus:outline-none" />
                  <button type="button" onClick={() => setShow((v) => !v)} className="h-full px-4 text-sm font-medium text-soft border-l border-[#EFE9E0]">{show ? t('hide') : t('show')}</button>
                </span>
              </label>
              <button type="button" role="switch" aria-checked={remember} onClick={() => setRemember((v) => !v)} className="flex items-center gap-[11px] text-[15px] text-[#3B352E]">
                <span className={cn('w-[52px] h-[30px] rounded-full p-[3px] flex transition-colors', remember ? 'bg-brand-500 justify-end' : 'bg-border justify-start')}><span className="w-6 h-6 rounded-full bg-surface" /></span>{t('remember')}
              </button>
              {failed && <p role="alert" className="text-busy-ink text-[15px]">{t('failed')}</p>}
              <Button type="submit" variant="primary" size="money" className="w-full" disabled={busy || !email || !password}>{t('submit')}</Button>
            </form>
          ) : (
            <form onSubmit={onActivate} className="flex flex-col gap-4">
              <span className="text-[19px] font-bold">{t('code.title')}</span>
              <p className="text-[15px] text-soft leading-relaxed">{t('code.intro')}</p>
              <label className="flex flex-col gap-[7px]"><span className="text-[15px] font-medium">{t('email')}</span>
                <span className="flex gap-2"><input aria-label={t('email')} value={email} onChange={(e) => setEmail(e.target.value)} type="email" autoComplete="username" className={cn(INPUT, 'flex-1')} /><Button type="button" onClick={onSendCode} disabled={busy || !email.includes('@')}>{t('code.send')}</Button></span></label>
              {codeState === 'sent' && <p role="status" className="text-[15px] text-free-ink">{t('code.sent')}</p>}
              <label className="flex flex-col gap-[7px]"><span className="text-[15px] font-medium">{t('code.code')}</span>
                <input aria-label={t('code.code')} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" className={cn(INPUT, 'font-mono tracking-[0.3em] text-2xl')} /></label>
              <label className="flex flex-col gap-[7px]"><span className="text-[15px] font-medium">{t('code.newPassword')}</span>
                <input aria-label={t('code.newPassword')} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} autoComplete="new-password" className={INPUT} /></label>
              <label className="flex flex-col gap-[7px]"><span className="text-[15px] font-medium">{t('code.confirm')}</span>
                <input aria-label={t('code.confirm')} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" className={INPUT} /></label>
              {codeState === 'invalid' && <p role="alert" className="text-busy-ink text-[15px]">{t('code.invalid')}</p>}
              {codeState === 'mismatch' && <p role="alert" className="text-busy-ink text-[15px]">{t('code.mismatch')}</p>}
              <Button type="submit" variant="primary" size="money" className="w-full" disabled={busy || code.length !== 6 || newPassword.length < 8}>{t('code.activate')}</Button>
              <button type="button" onClick={() => setMode('password')} className="text-sm font-medium text-brand-600 self-start">{t('code.back')}</button>
            </form>
          )}
        </div>
        <div className="flex items-center justify-between gap-4 pt-5 border-t border-[#EFE9E0] text-sm">
          <span className="text-ink-3">{t('footer', { odoo: odooVersion })}</span>
          <span className="inline-flex items-center gap-2 text-soft"><span className={cn('w-[7px] h-[7px] rounded-full', online === false ? 'bg-busy' : 'bg-free')} />{online === false ? t('offline') : t('online')}</span>
        </div>
      </section>
    </main>
  )
}
