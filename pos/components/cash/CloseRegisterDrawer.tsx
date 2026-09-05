'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { TextInput } from '@/components/ui/Field'
import { cashDifference } from '@/lib/domain/cash'
import { formatCop } from '@/lib/domain/money'
import type { ClosingData, CloseResult } from '@/lib/services/cashRegister'
import { cn } from '@/lib/utils'

const TONE = { ok: 'text-free-ink', warn: 'text-pending-ink', busy: 'text-busy-ink' }

export function CloseRegisterDrawer({ data, onClose, onConfirm }: { data: ClosingData; onClose: () => void; onConfirm: (counted: number, notes: string) => Promise<CloseResult> }) {
  const t = useTranslations('pos.cash.close')
  const ui = useTranslations('pos.ui')
  const [counted, setCounted] = useState('')
  const [notes, setNotes] = useState('')
  const [state, setState] = useState<'idle' | 'closing' | 'closed' | 'failed'>('idle')
  const [message, setMessage] = useState('')
  const diff = counted === '' ? null : cashDifference(data.expectedCash, Number(counted))
  const blocked = data.draftOrders > 0
  async function confirm() {
    setState('closing')
    const result = await onConfirm(Number(counted), notes)
    setMessage(result.message)
    setState(result.successful ? 'closed' : 'failed')
  }
  return (
    <Drawer title={t('title')} subtitle={t('orders', { n: data.ordersCount, amount: formatCop(data.ordersTotal) })} onClose={onClose} closeLabel={ui('close')}
      footer={state === 'closed' ? undefined : <><Button variant="primary" className="flex-1" onClick={confirm} disabled={blocked || counted === '' || state === 'closing'}>{state === 'closing' ? t('closing') : t('confirm')}</Button><Button onClick={onClose}>{ui('cancel')}</Button></>}>
      {blocked && <p role="alert" className="rounded-[10px] bg-busy-soft text-busy-ink px-3.5 py-3 text-[15px]">{t('drafts', { n: data.draftOrders })}</p>}
      <section className="flex flex-col gap-2">
        <span className="text-[13px] tracking-[0.08em] uppercase text-ink-3 font-medium">{t('byMethod')}</span>
        <div className="flex justify-between text-[15px]"><span>{t('cash')} <span className="text-soft">· {t('opening', { amount: formatCop(data.openingCash) })}</span></span><span className="font-mono tabular">{formatCop(data.cashPayments)}</span></div>
        {data.otherMethods.map((m) => <div key={m.id} className="flex justify-between text-[15px]"><span>{m.name} <span className="text-soft">· {m.count}</span></span><span className="font-mono tabular">{formatCop(m.amount)}</span></div>)}
        {data.cashMoves.map((m, i) => <div key={i} className="flex justify-between text-[15px] text-soft"><span>{m.name}</span><span className="font-mono tabular">{formatCop(m.amount)}</span></div>)}
      </section>
      <div className="flex flex-col gap-1"><span className="text-[13px] tracking-[0.08em] uppercase text-ink-3 font-medium">{t('expected')}</span><span className="font-mono tabular text-[34px]">$ {formatCop(data.expectedCash)}</span></div>
      <TextInput label={t('counted')} type="number" min={0} inputMode="numeric" value={counted} onChange={(e) => setCounted(e.target.value)} className="font-mono text-2xl h-tap-money" disabled={state === 'closed'} />
      {diff && <div className="flex justify-between text-[17px]"><span>{t('difference')}</span><span className={cn('font-mono tabular font-medium', TONE[diff.tone])}>{diff.amount > 0 ? '+' : ''}{formatCop(diff.amount)}</span></div>}
      <TextInput label={t('notes')} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={state === 'closed'} />
      {state === 'closed' && <p role="status" className="text-[15px] text-free-ink">{t('closed')}</p>}
      {state === 'failed' && <p role="alert" className="text-[15px] text-busy-ink">{t('failed', { message })}</p>}
    </Drawer>
  )
}
