'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/Field'

export function NewTableDialog({ floorName, nextNumber, onCreate, onCancel }: { floorName: string; nextNumber: number; onCreate: (n: number, seats: number) => Promise<void>; onCancel: () => void }) {
  const t = useTranslations('pos.salon.newTableDialog')
  const ui = useTranslations('pos.ui')
  const [number, setNumber] = useState(String(nextNumber))
  const [seats, setSeats] = useState('4')
  const [busy, setBusy] = useState(false)
  return (
    <div role="dialog" aria-modal="true" aria-label={t('title')} className="fixed inset-0 z-50 grid place-items-center bg-overlay/60 p-6">
      <form onSubmit={async (e) => { e.preventDefault(); setBusy(true); try { await onCreate(Number(number), Number(seats)) } finally { setBusy(false) } }} className="w-[440px] rounded-[18px] bg-surface p-6 flex flex-col gap-4 shadow-xl">
        <span className="text-[19px] font-bold">{t('title')}</span>
        <p className="text-[15px] text-soft">{t('body', { floor: floorName })}</p>
        <TextInput label={t('number')} type="number" min={1} value={number} onChange={(e) => setNumber(e.target.value)} className="font-mono text-lg" />
        <TextInput label={t('seats')} type="number" min={1} value={seats} onChange={(e) => setSeats(e.target.value)} className="font-mono text-lg" />
        <div className="flex gap-2.5"><Button type="submit" variant="primary" className="flex-1" disabled={busy || !number || !seats}>{t('create')}</Button><Button type="button" onClick={onCancel}>{ui('cancel')}</Button></div>
      </form>
    </div>
  )
}
