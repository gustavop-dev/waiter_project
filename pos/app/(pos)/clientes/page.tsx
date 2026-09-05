'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { CustomerForm } from '@/components/customers/CustomerForm'
import { Shell } from '@/components/layout/Shell'
import { Topbar } from '@/components/layout/Topbar'
import { Button } from '@/components/ui/Button'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { formatCop } from '@/lib/domain/money'
import { customerOrders, identificationTypes, listCustomers, saveCustomer, type Customer, type CustomerInput, type CustomerOrder, type IdType } from '@/lib/services/customers'

const EMPTY: CustomerInput = { name: '', phone: '', email: '', vat: '', idTypeId: null, street: '', city: '' }

export default function ClientesPage() {
  const t = useTranslations('pos.customers')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [idTypes, setIdTypes] = useState<IdType[]>([])
  const [query, setQuery] = useState('')
  const [panel, setPanel] = useState<{ id: number | null } | null>(null)
  const [history, setHistory] = useState<{ id: number; orders: CustomerOrder[] } | null>(null)

  useEffect(() => { void identificationTypes().then(setIdTypes) }, [])
  useEffect(() => { const h = setTimeout(() => { void listCustomers(query).then(setCustomers) }, 250); return () => clearTimeout(h) }, [query])
  useEffect(() => { if (panel?.id) void customerOrders(panel.id).then((orders) => setHistory({ id: panel.id!, orders })) }, [panel])

  const editing = panel?.id ? customers.find((c) => c.id === panel.id) : undefined
  async function onSave(input: CustomerInput) {
    const id = await saveCustomer(panel?.id ?? null, input)
    setCustomers(await listCustomers(query))
    setPanel({ id })
  }
  const columns: Column<Customer>[] = [
    { key: 'name', header: t('cols.name'), render: (c) => <span className="font-medium">{c.name}</span> },
    { key: 'doc', header: t('cols.doc'), width: '150px', render: (c) => <span className="font-mono tabular text-soft">{c.vat || '—'}</span> },
    { key: 'phone', header: t('cols.phone'), width: '150px', render: (c) => c.phone || '—' },
    { key: 'orders', header: t('cols.orders'), width: '100px', align: 'right', render: (c) => <span className="font-mono tabular">{c.orders}</span> },
    { key: 'inv', header: t('cols.invoiced'), width: '140px', align: 'right', render: (c) => <span className="font-mono tabular">{formatCop(c.invoiced)}</span> },
  ]
  return (
    <Shell mode="sidebar" active="customers">
      <Topbar left={<div className="flex flex-col gap-0.5"><span className="text-[22px] font-bold">{t('title')}</span><span className="text-[15px] text-soft">{t('subtitle', { n: customers.length })}</span></div>}
        right={<><input aria-label={t('search')} placeholder={t('search')} value={query} onChange={(e) => setQuery(e.target.value)} className="h-tap px-4 rounded-[10px] border border-border bg-surface text-base w-80" />
          <Button variant="primary" onClick={() => setPanel({ id: null })}>{t('new')}</Button></>} />
      <div className="flex-1 min-h-0 flex">
        <section className="flex-1 min-w-0 p-6 px-7 flex flex-col">
          <div className="flex-1 min-h-0 rounded-[18px] bg-surface border border-[#E9E2D7] flex flex-col overflow-hidden">
            <DataTable columns={columns} rows={customers} rowKey={(c) => c.id} emptyText={t('empty')} onRowClick={(c) => setPanel({ id: c.id })} selectedKey={panel?.id ?? null} />
          </div>
        </section>
        {panel && (
          <CustomerForm key={panel.id ?? 'new'} initial={editing ? { name: editing.name, phone: editing.phone, email: editing.email, vat: editing.vat, idTypeId: editing.idTypeId, street: editing.street, city: editing.city } : EMPTY}
            isNew={panel.id === null} idTypes={idTypes} history={history?.id === panel.id ? history.orders : []} onSave={onSave} onClose={() => setPanel(null)} />
        )}
      </div>
    </Shell>
  )
}
