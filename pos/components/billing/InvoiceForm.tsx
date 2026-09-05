'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/Button'
import { Drawer } from '@/components/ui/Drawer'
import { formatCop } from '@/lib/domain/money'
import { listCustomers, type Customer } from '@/lib/services/customers'
import { invoicePdfUrl, type InvoiceableOrder } from '@/lib/services/invoices'

interface InvoiceFormProps { order: InvoiceableOrder; onIssue: (partnerId: number) => Promise<{ id: number; name: string }>; onClose: () => void }

export function InvoiceForm({ order, onIssue, onClose }: InvoiceFormProps) {
  const t = useTranslations('pos.billing.form')
  const ui = useTranslations('pos.ui')
  const [query, setQuery] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [partnerId, setPartnerId] = useState<number | null>(order.partnerId)
  const [issued, setIssued] = useState<{ id: number; name: string } | null>(null)
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle')
  useEffect(() => { const h = setTimeout(() => { void listCustomers(query).then(setCustomers) }, 250); return () => clearTimeout(h) }, [query])
  async function issue() {
    if (partnerId === null) return
    setState('saving')
    try { setIssued(await onIssue(partnerId)); setState('idle') } catch { setState('error') }
  }
  return (
    <Drawer title={t('title')} subtitle={`#${order.id} · $ ${formatCop(order.total)}`} onClose={onClose} closeLabel={ui('close')}
      footer={issued ? <a href={invoicePdfUrl(issued.id)} target="_blank" rel="noreferrer" className="flex-1 h-tap rounded-[10px] bg-brand-500 text-white grid place-items-center text-base font-bold">{t('pdf')}</a>
        : <><Button variant="primary" className="flex-1" onClick={issue} disabled={partnerId === null || state === 'saving'}>{t('issue')}</Button><Button onClick={onClose}>{ui('cancel')}</Button></>}>
      {issued ? <p role="status" className="text-[17px] text-free-ink">{t('issued', { name: issued.name })}</p> : (
        <>
          <input aria-label={t('search')} placeholder={t('search')} value={query} onChange={(e) => setQuery(e.target.value)} className="h-tap-min px-3.5 rounded-[10px] border border-border bg-surface text-base" />
          <div role="radiogroup" aria-label={t('customer')} className="flex flex-col gap-1.5">
            {customers.length === 0 && <span className="text-[15px] text-soft">{t('none')} · <Link href="/clientes" className="text-brand-600 font-medium">{t('goCustomers')}</Link></span>}
            {customers.map((c) => (
              <button key={c.id} type="button" role="radio" aria-checked={partnerId === c.id} onClick={() => setPartnerId(c.id)}
                className={`h-tap-min px-3.5 rounded-[10px] border text-left text-[15px] flex justify-between ${partnerId === c.id ? 'border-brand-500 bg-brand-50 font-medium' : 'border-border bg-surface'}`}>
                <span>{c.name}</span><span className="font-mono tabular text-soft">{c.vat || '—'}</span>
              </button>
            ))}
          </div>
          {state === 'error' && <p role="alert" className="text-[15px] text-busy-ink">{ui('error')}</p>}
        </>
      )}
    </Drawer>
  )
}
