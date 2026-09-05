'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Select, TextInput } from '@/components/ui/Field'
import { listConfigs, type RegisterConfig } from '@/lib/services/cashRegister'
import { useAuthStore } from '@/lib/stores/authStore'

// Inicio del turno: cuenta el efectivo, abre la caja. Vive fuera del gate porque es justo lo que el gate exige.
export default function CajaPage() {
  const t = useTranslations('pos.cash')
  const router = useRouter()
  const { user, session, hydrated, hydrate, openRegister } = useAuthStore()
  const [configs, setConfigs] = useState<RegisterConfig[]>([])
  const [configId, setConfigId] = useState<number | null>(null)
  const [cash, setCash] = useState('0')
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { void hydrate() }, [hydrate])
  useEffect(() => {
    if (!hydrated) return
    if (!user) { router.replace('/login'); return }
    if (session) { router.replace('/salon'); return }
    void listConfigs().then((c) => { setConfigs(c); setConfigId((id) => id ?? c[0]?.id ?? null) })
  }, [hydrated, user, session, router])

  async function open() {
    if (configId === null) return
    setBusy(true)
    try { await openRegister(configId, Number(cash), notes); router.replace('/salon') } finally { setBusy(false) }
  }
  if (!hydrated || !user || session) return null
  return (
    <main className="min-h-screen grid place-items-center bg-canvas p-6">
      <form onSubmit={(e) => { e.preventDefault(); void open() }} className="w-[460px] rounded-[18px] bg-surface border border-[#E9E2D7] p-7 flex flex-col gap-5">
        <div className="flex items-center gap-2.5"><span className="h-[30px] px-2 rounded-sm bg-brand-500 grid place-items-center font-bold text-[17px] tracking-[-0.05em] text-ink">Wt.</span><span className="text-[22px] font-bold">{t('openTitle')}</span></div>
        <p className="text-[15px] text-soft leading-relaxed">{t('openBody')}</p>
        <Select label={t('config')} value={configId ?? ''} onChange={(e) => setConfigId(Number(e.target.value))}>{configs.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</Select>
        <TextInput label={t('openingCash')} type="number" min={0} inputMode="numeric" value={cash} onChange={(e) => setCash(e.target.value)} className="font-mono text-2xl h-tap-money" />
        <TextInput label={t('notes')} value={notes} onChange={(e) => setNotes(e.target.value)} />
        <Button type="submit" variant="primary" size="money" disabled={busy || configId === null || cash === ''}>{busy ? t('opening') : t('open')}</Button>
      </form>
    </main>
  )
}
