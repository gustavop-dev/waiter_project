'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { Card } from '@/components/kit/Card'
import { Icon } from '@/components/kit/Icon'
import { KitEmptyState } from '@/components/kit/KitEmptyState'
import { StatusPill } from '@/components/kit/StatusPill'
import { Button } from '@/components/ui/Button'
import { SearchInput } from '@/components/ui/SearchInput'
import { formatCop } from '@/lib/domain/money'
import { listCustomers, type Customer } from '@/lib/services/customers'
import { invoicePdfUrl, orderLines, type Invoice, type InvoiceableOrder, type OrderLine } from '@/lib/services/invoices'
import { cn } from '@/lib/utils'

export type Selection = { kind: 'order'; order: InvoiceableOrder } | { kind: 'invoice'; invoice: Invoice } | null
interface InvoicePanelProps { selection: Selection; tableNumber: number | null; onIssue: (orderId: number, partnerId: number) => Promise<{ id: number; name: string }> }

const day = (at: string) => (at ? new Date(at.replace(' ', 'T') + (at.length > 10 ? 'Z' : '')).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }) : '—')
const STATE_TONE = { draft: 'neutral', posted: 'success', cancel: 'danger' } as const

// Panel "Bill Information" del kit (Order History / Bill Selected.png): cabecera con avatar, detalle de líneas, totales
// y el botón grande al pie: "Emitir factura" o "Ver PDF".
export function InvoicePanel({ selection, tableNumber, onIssue }: InvoicePanelProps) {
  const t = useTranslations('admin.billing')
  const ui = useTranslations('admin.common')
  const pdfLink = (id: number) => <a href={invoicePdfUrl(id)} target="_blank" rel="noreferrer" className="h-tap rounded-md bg-brand-500 text-white flex items-center justify-center gap-2 text-base font-bold"><Icon name="printer" size={20} />{t('panel.pdf')}</a>
  return (
    <Card title={t('panel.title')} className="w-[400px] shrink-0">
      {!selection && <KitEmptyState icon="billing" title={t('panel.empty')} body={t('panel.emptyBody')} />}
      {selection?.kind === 'invoice' && (
        <div className="h-full flex flex-col">
          <div className="p-5 flex items-center gap-3 border-b border-border">
            <span className="w-12 h-12 rounded-md bg-primary text-primary-ink grid place-items-center"><Icon name="billing" size={22} /></span>
            <div className="min-w-0"><p className="text-[16px] font-semibold text-ink truncate">{selection.invoice.partner || t('noCustomer')}</p><p className="text-[13px] text-soft">{t('panel.number')} <span className="font-semibold text-ink">{selection.invoice.name}</span></p></div>
            <span className="ml-auto text-[13px] text-soft text-right">{day(selection.invoice.date)}</span>
          </div>
          <div className="p-5 flex flex-wrap gap-2">
            <StatusPill tone={STATE_TONE[selection.invoice.state as keyof typeof STATE_TONE] ?? 'neutral'}>{t(`state.${selection.invoice.state as 'draft' | 'posted' | 'cancel'}`)}</StatusPill>
            <StatusPill tone={selection.invoice.paymentState === 'paid' ? 'success' : 'info'}>{selection.invoice.paymentState === 'paid' ? t('paid') : t('notPaid')}</StatusPill>
          </div>
          <div className="mt-auto p-5 flex flex-col gap-4">
            <div className="rounded-md bg-muted p-4 flex justify-between items-baseline"><span className="text-[16px] text-soft">{t('panel.total')}</span><span className="text-[20px] font-semibold text-ink tabular">$ {formatCop(selection.invoice.total)}</span></div>
            {pdfLink(selection.invoice.id)}
          </div>
        </div>
      )}
      {selection?.kind === 'order' && <OrderPanel key={selection.order.id} order={selection.order} tableNumber={tableNumber} onIssue={onIssue} pdfLink={pdfLink} ui={ui} />}
    </Card>
  )
}

function OrderPanel({ order, tableNumber, onIssue, pdfLink, ui }: { order: InvoiceableOrder; tableNumber: number | null; onIssue: InvoicePanelProps['onIssue']; pdfLink: (id: number) => React.ReactNode; ui: (k: 'error') => string }) {
  const t = useTranslations('admin.billing')
  const [lines, setLines] = useState<OrderLine[]>([])
  const [query, setQuery] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [partnerId, setPartnerId] = useState<number | null>(order.partnerId)
  const [issued, setIssued] = useState<{ id: number; name: string } | null>(order.invoiceId ? { id: order.invoiceId, name: '' } : null)
  const [state, setState] = useState<'idle' | 'saving' | 'error'>('idle')
  useEffect(() => { void orderLines(order.id).then(setLines) }, [order.id])
  useEffect(() => { const h = setTimeout(() => { void listCustomers(query).then((rows) => setCustomers(rows.slice(0, 6))) }, 250); return () => clearTimeout(h) }, [query])
  async function issue() {
    if (partnerId === null) return
    setState('saving')
    try { setIssued(await onIssue(order.id, partnerId)); setState('idle') } catch { setState('error') }
  }
  const subtotal = order.total - order.tax
  return (
    <div className="h-full flex flex-col">
      <div className="p-5 flex items-center gap-3 border-b border-border">
        <span className="w-12 h-12 rounded-md bg-primary text-primary-ink grid place-items-center text-[16px] font-semibold">{tableNumber ?? <Icon name="receipt" size={22} />}</span>
        <div className="min-w-0"><p className="text-[16px] font-semibold text-ink truncate">{order.partnerName || t('noCustomer')}</p><p className="text-[13px] text-soft">{t('cols.order')} <span className="font-semibold text-ink">{order.id}</span></p></div>
        <span className="ml-auto text-[13px] text-soft text-right">{day(order.date)}</span>
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <p className="px-5 pt-4 pb-2 text-[15px] font-semibold text-ink">{t('panel.details')}</p>
        <ul className="px-5">
          {lines.map((l) => (
            <li key={l.id} className="py-2.5 border-b border-border flex items-start justify-between gap-3 text-[15px]">
              <div className="min-w-0"><p className="font-medium text-ink truncate">{l.name}</p><p className="text-[13px] text-soft tabular">$ {formatCop(l.unit)}</p></div>
              <div className="text-right shrink-0"><p className="text-[13px] text-soft">× {l.qty}</p><p className="font-semibold text-ink tabular">$ {formatCop(l.total)}</p></div>
            </li>
          ))}
        </ul>
        {!issued && (
          <section aria-label={t('panel.customer')} className="p-5 flex flex-col gap-2">
            <p className="text-[15px] font-semibold text-ink">{t('panel.customer')}</p>
            <SearchInput value={query} onChange={setQuery} placeholder={t('panel.searchCustomer')} />
            <div role="radiogroup" aria-label={t('panel.customer')} className="flex flex-col gap-1.5">
              {customers.length === 0 && <span className="text-[14px] text-soft">{t('panel.noCustomers')} · <Link href="/clientes" className="text-primary font-semibold">{t('panel.goCustomers')}</Link></span>}
              {customers.map((c) => (
                <button key={c.id} type="button" role="radio" aria-checked={partnerId === c.id} onClick={() => setPartnerId(c.id)}
                  className={cn('h-11 px-3.5 rounded-md border text-left text-[15px] flex justify-between items-center', partnerId === c.id ? 'border-primary bg-primary-soft text-primary font-semibold' : 'border-border bg-surface text-ink')}>
                  <span className="truncate">{c.name}</span><span className="tabular text-soft text-[13px]">{c.vat || '—'}</span>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
      <div className="p-5 flex flex-col gap-4 border-t border-border">
        <div className="rounded-md bg-muted p-4 flex flex-col gap-1.5 text-[15px]">
          <div className="flex justify-between text-soft"><span>{t('panel.subtotal')}</span><span className="tabular text-ink">$ {formatCop(subtotal)}</span></div>
          <div className="flex justify-between text-soft"><span>{t('panel.tax')}</span><span className="tabular text-ink">$ {formatCop(order.tax)}</span></div>
          <div className="flex justify-between items-baseline pt-2 border-t border-dashed border-border"><span className="text-[16px] text-soft">{t('panel.total')}</span><span className="text-[20px] font-semibold text-ink tabular">$ {formatCop(order.total)}</span></div>
        </div>
        {issued?.name && <p role="status" className="text-[14px] text-success-ink">{t('panel.issued', { name: issued.name })}</p>}
        {state === 'error' && <p role="alert" className="text-[14px] text-danger-ink">{ui('error')}</p>}
        {issued ? pdfLink(issued.id) : <Button variant="primary" size="money" onClick={issue} disabled={partnerId === null || state === 'saving'}><Icon name="billing" size={20} />{state === 'saving' ? t('panel.issuing') : t('panel.issue')}</Button>}
      </div>
    </div>
  )
}
