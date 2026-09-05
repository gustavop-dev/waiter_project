'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { TextInput } from '@/components/ui/Field'
import type { StockRow } from '@/lib/services/inventory'

export function StockForm({ row, onApply, onClose }: { row: StockRow; onApply: (qty: number) => Promise<void>; onClose: () => void }) {
  const t = useTranslations('pos.inventory.form')
  const ui = useTranslations('pos.ui')
  const [qty, setQty] = useState(String(Math.max(0, row.qty)))
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  async function apply() {
    setState('saving')
    try { await onApply(Number(qty)); setState('saved') } catch { setState('error') }
  }
  return (
    <Drawer title={t('title')} subtitle={row.name} onClose={onClose} closeLabel={ui('close')}
      footer={<><Button variant="primary" className="flex-1" onClick={apply} disabled={state === 'saving' || qty === '' || Number(qty) < 0}>{t('apply')}</Button><Button onClick={onClose}>{ui('cancel')}</Button></>}>
      <div className="flex flex-col gap-1"><span className="text-[13px] tracking-[0.08em] uppercase text-ink-3 font-medium">{t('current')}</span><span className="font-mono tabular text-[34px]">{row.qty}</span></div>
      <TextInput label={t('qty')} type="number" inputMode="numeric" min={0} value={qty} onChange={(e) => setQty(e.target.value)} className="font-mono text-2xl h-tap-money" />
      {state === 'saved' && <p role="status" className="text-[15px] text-free-ink">{t('applied')}</p>}
      {state === 'error' && <p role="alert" className="text-[15px] text-busy-ink">{ui('error')}</p>}
    </Drawer>
  )
}
