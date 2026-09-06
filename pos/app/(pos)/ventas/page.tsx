'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

import { CloseRegisterDrawer } from '@/components/cash/CloseRegisterDrawer'
import { RegisterCard } from '@/components/cash/RegisterCard'
import { Shell } from '@/components/layout/Shell'
import { Topbar } from '@/components/layout/Topbar'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Select } from '@/components/ui/Field'
import { KpiCard } from '@/components/ui/KpiCard'
import { formatCop } from '@/lib/domain/money'
import { can } from '@/lib/domain/roles'
import { cashInOut, closeRegister, closingData, forceCloseRegister, type ClosingData } from '@/lib/services/cashRegister'
import { listSales, listShifts, paymentsByMethod, salesByWaiter, topProducts, type MethodTotal, type ProductTotal, type SaleRow, type ShiftRow, type WaiterTotal } from '@/lib/services/sales'
import { useAuthStore } from '@/lib/stores/authStore'
import { useCatalogStore } from '@/lib/stores/catalogStore'
import { cn } from '@/lib/utils'

interface Data { shiftId: number; sales: SaleRow[]; methods: MethodTotal[]; waiters: WaiterTotal[]; top: ProductTotal[] }
const time = (at: string) => new Date(at.replace(' ', 'T') + 'Z').toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
const day = (at: string) => new Date(at.replace(' ', 'T') + 'Z').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })

export default function VentasPage() {
  const t = useTranslations('pos.sales')
  const catalog = useCatalogStore((s) => s.catalog)
  const { session, refreshSession, user } = useAuthStore()
  const role = user?.role ?? 'waiter'
  const [closing, setClosing] = useState<ClosingData | null>(null)
  const [expectedCash, setExpectedCash] = useState<number | null>(null)
  const [shifts, setShifts] = useState<ShiftRow[]>([])
  const [shiftId, setShiftId] = useState<number | null>(null)
  const [data, setData] = useState<Data | null>(null)
  const tableNumberOf = useMemo(() => (id: number) => catalog?.tables.find((tb) => tb.id === id)?.number ?? null, [catalog])

  useEffect(() => { void listShifts().then((rows) => { setShifts(rows); if (rows[0]) setShiftId((id) => id ?? rows[0].id) }) }, [])
  useEffect(() => { if (session) void closingData(session.id).then((d) => setExpectedCash(d.expectedCash)) }, [session])
  useEffect(() => {
    if (shiftId === null) return
    void Promise.all([listSales(shiftId, tableNumberOf), paymentsByMethod(shiftId), salesByWaiter(shiftId), topProducts(shiftId)])
      .then(([sales, methods, waiters, top]) => setData({ shiftId, sales, methods, waiters, top }))
  }, [shiftId, tableNumberOf])

  const current = data?.shiftId === shiftId ? data : null
  const total = current?.sales.reduce((a, s) => a + s.total, 0) ?? 0
  const autonomous = current?.sales.filter((s) => s.origin !== 'waiter').length ?? 0
  const maxMethod = Math.max(...(current?.methods.map((m) => m.amount) ?? [1]), 1)
  const columns: Column<SaleRow>[] = [
    { key: 'ref', header: t('cols.order'), width: '90px', render: (s) => <code className="font-mono text-soft">#{s.id}</code> },
    { key: 'time', header: t('cols.time'), width: '80px', render: (s) => <span className="font-mono tabular">{time(s.paidAt)}</span> },
    { key: 'table', header: t('cols.table'), width: '110px', render: (s) => (s.tableNumber !== null ? `Mesa ${s.tableNumber}` : t('delivery')) },
    { key: 'waiter', header: t('cols.waiter'), render: (s) => s.waiter },
    { key: 'origin', header: t('cols.origin'), width: '110px', render: (s) => <span className={cn(s.origin === 'waiter' ? 'text-soft' : 'text-brand-600 font-bold')}>{s.origin === 'waiter' ? 'Mesero' : 'Autónomo'}</span> },
    { key: 'total', header: t('cols.total'), width: '130px', align: 'right', render: (s) => <span className="font-mono tabular">{formatCop(s.total)}</span> },
  ]
  return (
    <Shell mode="sidebar" active="sales">
      <Topbar left={<span className="text-[22px] font-bold">{t('title')}</span>}
        right={<div className="min-w-[320px]"><Select label={t('shift')} value={shiftId ?? ''} onChange={(e) => setShiftId(Number(e.target.value))}>
          {shifts.map((s) => <option key={s.id} value={s.id}>{t('shiftLabel', { name: s.name, date: day(s.startAt) })} · {s.state === 'closed' ? t('shiftClosed') : t('shiftOpen')}</option>)}
        </Select></div>} />
      <div className="flex-1 min-h-0 flex">
      <div className="flex-1 min-w-0 p-6 px-7 flex flex-col gap-[18px] overflow-y-auto">
        {session && can.closeRegister(role) && <RegisterCard openSince={shifts.find((s) => s.id === session.id)?.startAt ? time(shifts.find((s) => s.id === session.id)!.startAt) : '—'} expectedCash={expectedCash}
          onClose={() => void closingData(session.id).then(setClosing)} onMove={async (type, amount, reason) => { await cashInOut(session.id, type, amount, reason); setExpectedCash((await closingData(session.id)).expectedCash) }} />}
        <div className="grid grid-cols-4 gap-3">
          <KpiCard label={t('kpi.sales')} value={`$ ${formatCop(total)}`} />
          <KpiCard label={t('kpi.orders')} value={current?.sales.length ?? 0} />
          <KpiCard label={t('kpi.avg')} value={formatCop(current?.sales.length ? total / current.sales.length : 0)} />
          <KpiCard label={t('kpi.autonomous')} value={`${current?.sales.length ? Math.round((autonomous / current.sales.length) * 100) : 0}%`} tone="brand" />
        </div>
        <div className="grid grid-cols-3 gap-[18px]">
          <section className="rounded-[18px] bg-surface border border-border p-[22px] flex flex-col gap-3">
            <span className="text-[17px] font-bold">{t('byMethod')}</span>
            {(current?.methods ?? []).map((m) => (
              <div key={m.method} className="flex items-center gap-3"><span className="w-28 text-[15px] truncate">{m.method}</span>
                <span className="h-[22px] rounded-md bg-brand-500" style={{ width: `${Math.max(3, (m.amount / maxMethod) * 55)}%` }} aria-hidden /><span className="font-mono tabular text-[15px] text-soft">{formatCop(m.amount)}</span></div>
            ))}
          </section>
          <section className="rounded-[18px] bg-surface border border-border p-[22px] flex flex-col gap-3">
            <span className="text-[17px] font-bold">{t('byWaiter')}</span>
            {(current?.waiters ?? []).map((w) => (
              <div key={w.waiter} className="flex items-center justify-between text-[15px]"><span>{w.waiter} <span className="text-soft">· {w.orders} {t('cols.orders').toLowerCase()}</span></span><span className="font-mono tabular">{formatCop(w.amount)}</span></div>
            ))}
          </section>
          <section className="rounded-[18px] bg-surface border border-border p-[22px] flex flex-col gap-3">
            <span className="text-[17px] font-bold">{t('top')}</span>
            {(current?.top ?? []).map((p) => (
              <div key={p.product} className="flex items-center justify-between text-[15px]"><span className="truncate">{p.product} <span className="text-soft font-mono tabular">× {p.qty}</span></span><span className="font-mono tabular">{formatCop(p.amount)}</span></div>
            ))}
          </section>
        </div>
        <div className="rounded-[18px] bg-surface border border-border flex flex-col overflow-hidden">
          <div className="px-[22px] py-[18px] border-b border-border text-[19px] font-bold">{t('orders')}</div>
          <DataTable columns={columns} rows={current?.sales ?? []} rowKey={(s) => s.id} emptyText={t('empty')} />
        </div>
      </div>
      {closing && session && <CloseRegisterDrawer data={closing} onClose={() => setClosing(null)}
        onConfirm={async (counted, notes) => { const r = await closeRegister(session.id, counted, notes); if (r.successful) setTimeout(() => void refreshSession(), 1500); return r }}
        canForce={can.forceCloseRegister(role)} onForce={async () => { const r = await forceCloseRegister(session.id); if (r.successful) setTimeout(() => void refreshSession(), 1500); return r }} />}
      </div>
    </Shell>
  )
}
