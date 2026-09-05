'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Select, TextInput } from '@/components/ui/Field'
import { formatCop } from '@/lib/domain/money'

interface RegisterCardProps { openSince: string; expectedCash: number | null; onClose: () => void; onMove: (type: 'in' | 'out', amount: number, reason: string) => Promise<void> }

export function RegisterCard({ openSince, expectedCash, onClose, onMove }: RegisterCardProps) {
  const t = useTranslations('pos.cash')
  const [moving, setMoving] = useState(false)
  const [type, setType] = useState<'in' | 'out'>('in')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [done, setDone] = useState(false)
  async function apply() {
    await onMove(type, Number(amount), reason)
    setDone(true); setAmount(''); setReason('')
  }
  return (
    <section aria-label={t('card.title')} className="rounded-[18px] bg-sidebar text-sidebar-ink p-5 flex items-center gap-6">
      <div className="flex flex-col gap-1"><span className="text-[13px] tracking-[0.1em] uppercase text-[#8F877D] font-medium">{t('card.title')}</span><span className="text-[15px] text-sidebar-soft">{t('card.openSince', { time: openSince })}</span></div>
      <div className="flex flex-col gap-1 ml-4"><span className="text-[13px] tracking-[0.1em] uppercase text-[#8F877D] font-medium">{t('card.expectedCash')}</span><span className="font-mono tabular text-2xl">{expectedCash === null ? '—' : `$ ${formatCop(expectedCash)}`}</span></div>
      <div className="ml-auto flex items-end gap-2.5">
        {moving ? (
          <>
            <Select label={t('move.title')} value={type} onChange={(e) => setType(e.target.value as 'in' | 'out')} className="text-ink"><option value="in">{t('move.in')}</option><option value="out">{t('move.out')}</option></Select>
            <TextInput label={t('move.amount')} type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} className="font-mono text-ink w-36" />
            <TextInput label={t('move.reason')} value={reason} onChange={(e) => setReason(e.target.value)} className="text-ink w-48" />
            <Button size="compact" variant="primary" disabled={!amount || Number(amount) <= 0 || !reason.trim()} onClick={apply}>{t('move.apply')}</Button>
            <Button size="compact" className="bg-kds-surface text-sidebar-ink border-transparent" onClick={() => setMoving(false)}>✕</Button>
          </>
        ) : (
          <>
            {done && <span role="status" className="text-[13px] text-free-soft">{t('move.done')}</span>}
            <Button size="compact" className="bg-kds-surface text-sidebar-ink border-transparent" onClick={() => setMoving(true)}>{t('card.moves')}</Button>
            <Button size="compact" variant="primary" onClick={onClose}>{t('card.close')}</Button>
          </>
        )}
      </div>
    </section>
  )
}
