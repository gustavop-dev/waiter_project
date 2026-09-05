'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { StockForm } from '@/components/inventory/StockForm'
import { Shell } from '@/components/layout/Shell'
import { Topbar } from '@/components/layout/Topbar'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { KpiCard } from '@/components/ui/KpiCard'
import { stockStatus, type StockStatus } from '@/lib/domain/inventory'
import { listStock, setStock, stockLocationId, type StockRow } from '@/lib/services/inventory'
import { useAuthStore } from '@/lib/stores/authStore'
import { useCatalogStore } from '@/lib/stores/catalogStore'
import { cn } from '@/lib/utils'

const CHIP: Record<StockStatus, string> = { out: 'bg-busy-soft text-busy-ink', low: 'bg-pending-soft text-pending-ink', ok: 'bg-free-soft text-free-ink' }

export default function InventarioPage() {
  const t = useTranslations('pos.inventory')
  const session = useAuthStore((s) => s.session)
  const { catalog, load } = useCatalogStore()
  const [rows, setRows] = useState<StockRow[]>([])
  const [selected, setSelected] = useState<number | null>(null)

  const reload = () => listStock().then(setRows)
  useEffect(() => { void reload() }, [])

  const categoryOf = (productId: number) => {
    const ids = catalog?.products.find((p) => p.id === productId)?.categoryIds ?? []
    return ids.map((id) => catalog?.categories.find((c) => c.id === id)?.name).filter(Boolean).join(', ') || '—'
  }
  const out = rows.filter((r) => stockStatus(r.qty) === 'out').length
  const low = rows.filter((r) => stockStatus(r.qty) === 'low').length
  const current = rows.find((r) => r.productId === selected) ?? null
  async function apply(qty: number) {
    if (!current) return
    await setStock(current.productId, await stockLocationId(), qty)
    await reload()
    if (session) void load(session.id)
  }
  const columns: Column<StockRow>[] = [
    { key: 'name', header: t('cols.product'), render: (r) => <span className="font-medium">{r.name}</span> },
    { key: 'cat', header: t('cols.category'), width: '200px', render: (r) => <span className="text-soft">{categoryOf(r.productId)}</span> },
    { key: 'qty', header: t('cols.qty'), width: '130px', align: 'right', render: (r) => <span className="font-mono tabular text-lg">{r.qty}</span> },
    { key: 'st', header: t('cols.state'), width: '120px', align: 'right', render: (r) => <span className={cn('inline-flex h-[30px] px-2.5 rounded-lg items-center text-sm font-medium', CHIP[stockStatus(r.qty)])}>{t(`status.${stockStatus(r.qty)}`)}</span> },
  ]
  return (
    <Shell mode="sidebar" active="inventory" badges={out ? { inventory: { count: out, tone: 'warn' } } : {}}>
      <Topbar left={<div className="flex flex-col gap-0.5"><span className="text-[22px] font-bold">{t('title')}</span><span className="text-[15px] text-soft">{t('subtitle', { n: rows.length })}</span></div>}
        right={<Link href="/catalogo" className="text-[15px] text-brand-600 font-medium">{t('form.goCatalog')} →</Link>} />
      <div className="flex-1 min-h-0 flex">
        <section className="flex-1 min-w-0 p-6 px-7 flex flex-col gap-[18px]">
          <div className="grid grid-cols-3 gap-3">
            <KpiCard label={t('kpi.tracked')} value={rows.length} />
            <KpiCard label={t('kpi.low')} value={low} tone={low ? 'brand' : 'neutral'} />
            <KpiCard label={t('kpi.out')} value={out} tone={out ? 'busy' : 'neutral'} />
          </div>
          <div className="flex-1 min-h-0 rounded-[18px] bg-surface border border-[#E9E2D7] flex flex-col overflow-hidden">
            <DataTable columns={columns} rows={rows} rowKey={(r) => r.productId} emptyText={`${t('empty')} ${t('hint')}`} onRowClick={(r) => setSelected(r.productId)} selectedKey={selected} />
          </div>
        </section>
        {current && <StockForm key={current.productId} row={current} onApply={apply} onClose={() => setSelected(null)} />}
      </div>
    </Shell>
  )
}
