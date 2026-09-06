'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { Select, TextInput } from '@/components/ui/Field'
import { formatCop } from '@/lib/domain/money'
import type { CustomerInput, CustomerOrder, IdType } from '@/lib/services/customers'

interface CustomerFormProps { initial: CustomerInput; isNew: boolean; idTypes: IdType[]; history: CustomerOrder[]; onSave: (c: CustomerInput) => Promise<void>; onClose: () => void }

export function CustomerForm({ initial, isNew, idTypes, history, onSave, onClose }: CustomerFormProps) {
  const t = useTranslations('pos.customers.form')
  const ui = useTranslations('pos.ui')
  const [c, setC] = useState(initial)
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const patch = (x: Partial<CustomerInput>) => setC((v) => ({ ...v, ...x }))
  async function save() {
    setState('saving')
    try { await onSave({ ...c, name: c.name.trim() }); setState('saved') } catch { setState('error') }
  }
  return (
    <Drawer title={isNew ? t('newTitle') : t('title')} subtitle={isNew ? undefined : initial.name} onClose={onClose} closeLabel={ui('close')}
      footer={<><Button variant="primary" className="flex-1" onClick={save} disabled={state === 'saving' || !c.name.trim()}>{t('save')}</Button><Button onClick={onClose}>{ui('cancel')}</Button></>}>
      <TextInput label={t('name')} value={c.name} onChange={(e) => patch({ name: e.target.value })} />
      <Select label={t('idType')} value={c.idTypeId ?? ''} onChange={(e) => patch({ idTypeId: e.target.value ? Number(e.target.value) : null })}>
        <option value="">—</option>{idTypes.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
      </Select>
      <TextInput label={t('vat')} value={c.vat} onChange={(e) => patch({ vat: e.target.value })} className="font-mono" />
      <TextInput label={t('phone')} type="tel" value={c.phone} onChange={(e) => patch({ phone: e.target.value })} />
      <TextInput label={t('email')} type="email" value={c.email} onChange={(e) => patch({ email: e.target.value })} />
      <TextInput label={t('street')} value={c.street} onChange={(e) => patch({ street: e.target.value })} />
      <TextInput label={t('city')} value={c.city} onChange={(e) => patch({ city: e.target.value })} />
      {state === 'saved' && <p role="status" className="text-[15px] text-free-ink">{t('saved')}</p>}
      {state === 'error' && <p role="alert" className="text-[15px] text-busy-ink">{ui('error')}</p>}
      {!isNew && (
        <section aria-label={t('history')} className="flex flex-col gap-2 pt-3 border-t border-border">
          <span className="text-[13px] tracking-[0.08em] uppercase text-ink-3 font-medium">{t('history')}</span>
          {history.length === 0 && <span className="text-[15px] text-soft">{t('noHistory')}</span>}
          {history.map((o) => <div key={o.id} className="flex justify-between text-[15px]"><span className="text-soft">#{o.id} · {o.date.slice(0, 10)}</span><span className="font-mono tabular">{formatCop(o.total)}</span></div>)}
        </section>
      )}
    </Drawer>
  )
}
