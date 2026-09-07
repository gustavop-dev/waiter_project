'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

import { InvoicePanel, type Selection } from '@/components/billing/InvoicePanel'
import { Card } from '@/components/kit/Card'
import { Chip } from '@/components/kit/Chip'
import { KitEmptyState } from '@/components/kit/KitEmptyState'
import { KitShell } from '@/components/kit/KitShell'
import { StatusPill } from '@/components/kit/StatusPill'
import { PageHeader } from '@/components/ui/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { formatCop } from '@/lib/domain/money'
import { invoiceOrder, listInvoices, listPaidOrders, type Invoice, type InvoiceableOrder } from '@/lib/services/invoices'
import { useCatalogStore } from '@/lib/stores/catalogStore'
import { cn } from '@/lib/utils'

type Tab = 'pending' | 'invoices'
const day = (at: string) => (at ? new Date(at.replace(' ', 'T') + (at.length > 10 ? 'Z' : '')).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: at.length > 10 ? '2-digit' : undefined, minute: at.length > 10 ? '2-digit' : undefined }) : '—')
const STATE_TONE = { draft: 'neutral', posted: 'success', cancel: 'danger' } as const

// Facturación con la estructura de "Order History / Bill Selected" del kit: chips Pendientes / Facturas, lista de
// tarjetas y panel "Información de la factura" a la derecha.
export default function FacturacionPage() {
  const t = useTranslations('admin.billing')
  const catalog = useCatalogStore((s) => s.catalog)
  const [tab, setTab] = useState<Tab>('pending')
  const [query, setQuery] = useState('')
  const [orders, setOrders] = useState<InvoiceableOrder[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [selectedOrder, setSelectedOrder] = useState<number | null>(null)
  const [selectedInvoice, setSelectedInvoice] = useState<number | null>(null)
  const reload = () => Promise.all([listPaidOrders(), listInvoices()]).then(([o, i]) => { setOrders(o); setInvoices(i) })
  useEffect(() => { void reload() }, [])
  const tableNumberOf = useMemo(() => (id: number | null) => (id === null ? null : catalog?.tables.find((tb) => tb.id === id)?.number ?? null), [catalog])

  const q = query.trim().toLowerCase()
  const pending = orders.filter((o) => o.invoiceId === null && (!q || String(o.id).includes(q) || o.partnerName.toLowerCase().includes(q)))
  const shownInvoices = invoices.filter((i) => !q || i.name.toLowerCase().includes(q) || i.partner.toLowerCase().includes(q))
  const selection: Selection = tab === 'pending'
    ? (() => { const o = orders.find((x) => x.id === selectedOrder); return o ? { kind: 'order', order: o } : null })()
    : (() => { const i = invoices.find((x) => x.id === selectedInvoice); return i ? { kind: 'invoice', invoice: i } : null })()
  const rowClass = (on: boolean) => cn('rounded-md border bg-surface text-left overflow-hidden hover:border-primary/60', on ? 'border-primary' : 'border-border')
  const field = (label: string, value: React.ReactNode, first = false) => <div className={cn(!first && 'pl-4')}><p className="text-[13px] text-soft">{label}</p><div className="font-semibold text-ink">{value}</div></div>

  return (
    <KitShell>
      <PageHeader icon="billing" title={t('title')} actions={<SearchInput value={query} onChange={setQuery} placeholder={t('search')} className="w-[360px]" />}>
        <Chip label={t('tabs.pending')} count={orders.filter((o) => o.invoiceId === null).length} active={tab === 'pending'} onClick={() => setTab('pending')} />
        <Chip label={t('tabs.invoices')} count={invoices.length} active={tab === 'invoices'} onClick={() => setTab('invoices')} />
      </PageHeader>
      <div className="flex-1 min-h-0 flex gap-4 px-5 pb-5">
        <Card className="flex-1 min-w-0">
          <div className="h-full overflow-y-auto p-3 flex flex-col gap-3">
            {tab === 'pending' && pending.length === 0 && <KitEmptyState icon="billing" title={t('emptyPending')} />}
            {tab === 'invoices' && shownInvoices.length === 0 && <KitEmptyState icon="billing" title={t('emptyInvoices')} />}
            {tab === 'pending' && pending.map((o) => (
              <button key={o.id} type="button" onClick={() => setSelectedOrder(o.id)} aria-pressed={selectedOrder === o.id} className={rowClass(selectedOrder === o.id)}>
                <div className="h-10 px-4 flex items-center justify-between bg-muted text-[13px]"><span className="text-soft">{t('cols.order')} <span className="font-semibold text-ink">{o.id}</span></span><span className="text-soft">{day(o.date)}</span></div>
                <div className="px-4 py-3 grid grid-cols-4 divide-x divide-border text-[15px]">
                  {field(t('cols.table'), tableNumberOf(o.tableId) ?? '—', true)}
                  {field(t('cols.customer'), o.partnerName || <span className="text-soft font-normal">{t('noCustomer')}</span>)}
                  {field(t('cols.total'), <span className="tabular">$ {formatCop(o.total)}</span>)}
                  {field(t('cols.invoice'), <StatusPill tone="progress" className="h-7 text-[13px]">{t('notInvoiced')}</StatusPill>)}
                </div>
              </button>
            ))}
            {tab === 'invoices' && shownInvoices.map((i) => (
              <button key={i.id} type="button" onClick={() => setSelectedInvoice(i.id)} aria-pressed={selectedInvoice === i.id} className={rowClass(selectedInvoice === i.id)}>
                <div className="h-10 px-4 flex items-center justify-between bg-muted text-[13px]"><span className="text-soft">{t('cols.number')} <span className="font-semibold text-ink">{i.name}</span></span><span className="text-soft">{day(i.date)}</span></div>
                <div className="px-4 py-3 grid grid-cols-4 divide-x divide-border text-[15px]">
                  {field(t('cols.customer'), i.partner || <span className="text-soft font-normal">{t('noCustomer')}</span>, true)}
                  {field(t('cols.total'), <span className="tabular">$ {formatCop(i.total)}</span>)}
                  {field(t('cols.state'), <StatusPill tone={STATE_TONE[i.state as keyof typeof STATE_TONE] ?? 'neutral'} className="h-7 text-[13px]">{t(`state.${i.state as 'draft' | 'posted' | 'cancel'}`)}</StatusPill>)}
                  {field(t('paid'), <StatusPill tone={i.paymentState === 'paid' ? 'success' : 'info'} className="h-7 text-[13px]">{i.paymentState === 'paid' ? t('paid') : t('notPaid')}</StatusPill>)}
                </div>
              </button>
            ))}
          </div>
        </Card>
        <InvoicePanel selection={selection} tableNumber={selection?.kind === 'order' ? tableNumberOf(selection.order.tableId) : null}
          onIssue={async (orderId, partnerId) => { const id = await invoiceOrder(orderId, partnerId); await reload(); const inv = (await listInvoices(5)).find((i) => i.id === id); return { id, name: inv?.name ?? String(id) } }} />
      </div>
    </KitShell>
  )
}
