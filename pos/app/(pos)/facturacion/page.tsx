'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { InvoiceForm } from '@/components/billing/InvoiceForm'
import { Shell } from '@/components/layout/Shell'
import { Topbar } from '@/components/layout/Topbar'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { KpiCard } from '@/components/ui/KpiCard'
import { Segmented } from '@/components/ui/Segmented'
import { formatCop } from '@/lib/domain/money'
import { invoiceOrder, invoicePdfUrl, listInvoices, listPaidOrders, type Invoice, type InvoiceableOrder } from '@/lib/services/invoices'
import { cn } from '@/lib/utils'

type Tab = 'pending' | 'invoices'
const day = (at: string) => (at ? new Date(at.replace(' ', 'T') + (at.length > 10 ? 'Z' : '')).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' }) : '—')

export default function FacturacionPage() {
  const t = useTranslations('pos.billing')
  const [tab, setTab] = useState<Tab>('pending')
  const [orders, setOrders] = useState<InvoiceableOrder[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [selected, setSelected] = useState<number | null>(null)
  const reload = () => Promise.all([listPaidOrders(), listInvoices()]).then(([o, i]) => { setOrders(o); setInvoices(i) })
  useEffect(() => { void reload() }, [])

  const pending = orders.filter((o) => o.invoiceId === null)
  const month = new Date().toISOString().slice(0, 7)
  const thisMonth = invoices.filter((i) => i.date.startsWith(month) && i.state === 'posted')
  const current = orders.find((o) => o.id === selected) ?? null
  const orderCols: Column<InvoiceableOrder>[] = [
    { key: 'ref', header: t('cols.order'), width: '90px', render: (o) => <code className="font-mono text-soft">#{o.id}</code> },
    { key: 'date', header: t('cols.date'), width: '110px', render: (o) => day(o.date) },
    { key: 'cust', header: t('cols.customer'), render: (o) => o.partnerName || <span className="text-soft">{t('noCustomer')}</span> },
    { key: 'total', header: t('cols.total'), width: '130px', align: 'right', render: (o) => <span className="font-mono tabular">{formatCop(o.total)}</span> },
    { key: 'inv', header: t('cols.invoice'), width: '140px', align: 'right', render: (o) => <span className={cn('inline-flex h-[30px] px-2.5 rounded-lg items-center text-sm font-medium', o.invoiceId ? 'bg-free-soft text-free-ink' : 'bg-pending-soft text-pending-ink')}>{o.invoiceId ? t('invoiced') : t('notInvoiced')}</span> },
  ]
  const invoiceCols: Column<Invoice>[] = [
    { key: 'name', header: t('cols.number'), width: '170px', render: (i) => <code className="font-mono">{i.name}</code> },
    { key: 'date', header: t('cols.date'), width: '110px', render: (i) => day(i.date) },
    { key: 'cust', header: t('cols.customer'), render: (i) => i.partner },
    { key: 'total', header: t('cols.total'), width: '130px', align: 'right', render: (i) => <span className="font-mono tabular">{formatCop(i.total)}</span> },
    { key: 'state', header: t('cols.state'), width: '200px', align: 'right', render: (i) => <span className="inline-flex items-center gap-2"><span className="text-sm text-soft">{i.paymentState === 'paid' ? t('paid') : t('notPaid')}</span><a href={invoicePdfUrl(i.id)} target="_blank" rel="noreferrer" className="text-brand-600 font-medium text-sm">PDF</a></span> },
  ]
  return (
    <Shell mode="sidebar" active="billing">
      <Topbar left={<div className="flex flex-col gap-0.5"><span className="text-[22px] font-bold">{t('title')}</span><span className="text-[15px] text-soft">{t('subtitle')}</span></div>}
        right={<Segmented label={t('title')} options={[{ value: 'pending' as Tab, label: t('tabs.pending') }, { value: 'invoices' as Tab, label: t('tabs.invoices') }]} value={tab} onChange={setTab} />} />
      <div className="flex-1 min-h-0 flex">
        <section className="flex-1 min-w-0 p-6 px-7 flex flex-col gap-[18px]">
          <div className="grid grid-cols-3 gap-3">
            <KpiCard label={t('kpi.pending')} value={pending.length} tone={pending.length ? 'brand' : 'neutral'} />
            <KpiCard label={t('kpi.month')} value={thisMonth.length} />
            <KpiCard label={t('kpi.amount')} value={`$ ${formatCop(thisMonth.reduce((a, i) => a + i.total, 0))}`} />
          </div>
          <div className="flex-1 min-h-0 rounded-[18px] bg-surface border border-border flex flex-col overflow-hidden">
            {tab === 'pending'
              ? <DataTable columns={orderCols} rows={pending} rowKey={(o) => o.id} emptyText={t('emptyPending')} onRowClick={(o) => setSelected(o.id)} selectedKey={selected} />
              : <DataTable columns={invoiceCols} rows={invoices} rowKey={(i) => i.id} emptyText={t('emptyInvoices')} />}
          </div>
        </section>
        {current && tab === 'pending' && (
          <InvoiceForm key={current.id} order={current} onClose={() => setSelected(null)}
            onIssue={async (partnerId) => { const id = await invoiceOrder(current.id, partnerId); await reload(); const inv = (await listInvoices(5)).find((i) => i.id === id); return { id, name: inv?.name ?? String(id) } }} />
        )}
      </div>
    </Shell>
  )
}
