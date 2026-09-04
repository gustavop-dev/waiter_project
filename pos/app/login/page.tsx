'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/lib/stores/authStore'

export default function LoginPage() {
  const t = useTranslations('pos.login')
  const router = useRouter()
  const login = useAuthStore((s) => s.login)
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [failed, setFailed] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFailed(false)
    try { await login(user, password); router.push('/salon') } catch { setFailed(true) }
  }

  return (
    <main className="min-h-screen grid place-items-center bg-canvas p-6">
      <form onSubmit={onSubmit} className="w-full max-w-sm bg-surface border border-border rounded-lg p-8 flex flex-col gap-5">
        <h1 className="font-display text-4xl">{t('title')}</h1>
        <label className="flex flex-col gap-2 text-[15px] font-medium">{t('user')}
          <input value={user} onChange={(e) => setUser(e.target.value)} className="h-tap-min rounded-sm border border-border px-3 text-base" autoComplete="username" />
        </label>
        <label className="flex flex-col gap-2 text-[15px] font-medium">{t('password')}
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-tap-min rounded-sm border border-border px-3 text-base" autoComplete="current-password" />
        </label>
        {failed && <p role="alert" className="text-busy-ink text-[15px]">{t('failed')}</p>}
        <Button type="submit" variant="primary">{t('submit')}</Button>
      </form>
    </main>
  )
}
