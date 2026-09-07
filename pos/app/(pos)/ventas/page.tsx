'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

import { CloseRegisterModal } from '@/components/cash/CloseRegisterModal'
import { RegisterCard } from '@/components/cash/RegisterCard'
import { Card } from '@/components/kit/Card'
import { Icon } from '@/components/kit/Icon'
import { KitEmptyState } from '@/components/kit/KitEmptyState'
import { KitShell } from '@/components/kit/KitShell'
import { StatusPill } from '@/components/kit/StatusPill'
import { KitTable, type KitColumn } from '@/components/ui/KitTable'
import { KpiTile } from '@/components/ui/KpiTile'
import { PageHeader } from '@/components/ui/PageHeader'
import { formatCop } from '@/lib/domain/money'
import { can } from '@/lib/domain/roles'
import { cashInOut, closeRegister, closingData, forceCloseRegister, type ClosingData } from '@/lib/services/cashRegister'
import { listSales, listShifts, paymentsByMethod, salesByWaiter, topProducts, type MethodTotal, type ProductTotal, type SaleRow, type ShiftRow, type WaiterTotal } from '@/lib/services/sales'
import { useAuthStore } from '@/lib/stores/authStore'
import { useCatalogStore } from '@/lib/stores/catalogStore'

interface Data { shiftId: number; sales: SaleRow[]; methods: MethodTotal[]; waiters: WaiterTotal[]; top: ProductTotal[] }
const time = (at: string) => new Date(at.replace(' ', 'T') + 'Z').toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false })
const day = (at: string) => new Date(at.replace(' ', 'T') + 'Z').toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })

// Ventas del turno con la estructura del Dashboard del kit (KPIs con icono, tarjetas) y la caja arriba.
export default function VentasPage() {
  const t = useTranslations('cash.sales')
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
  const openShift = session ? shifts.find((s) => s.id === session.id) : undefined
  const columns: KitColumn<SaleRow>[] = [
    { key: 'ref', header: t('cols.order'), width: '110px', render: (s) => <span className="font-semibold">#{s.id}</span> },
    { key: 'time', header: t('cols.time'), width: '90px', render: (s) => <span className="tabular">{time(s.paidAt)}</span> },
    { key: 'table', header: t('cols.table'), width: '120px', render: (s) => (s.tableNumber !== null ? t('table', { n: s.tableNumber }) : t('delivery')) },
    { key: 'waiter', header: t('cols.waiter'), render: (s) => s.waiter },
    { key: 'origin', header: t('cols.origin'), width: '140px', render: (s) => <StatusPill tone={s.origin === 'waiter' ? 'neutral' : 'info'}>{s.origin === 'waiter' ? t('origin.waiter') : t('origin.auto')}</StatusPill> },
    { key: 'total', header: t('cols.total'), width: '140px', align: 'right', render: (s) => <span className="font-semibold tabular">$ {formatCop(s.total)}</span> },
  ]
  const list = (rows: { key: string; label: string; meta?: string; amount: number }[]) => (
    <div className="p-5 flex flex-col gap-3">
      {rows.length === 0 && <p className="text-[14px] text-soft">{t('none')}</p>}
      {rows.map((r) => <div key={r.key} className="flex items-center justify-between gap-3 text-[15px]"><span className="min-w-0 truncate">{r.label}{r.meta && <span className="text-soft"> · {r.meta}</span>}</span><span className="font-semibold tabular shrink-0">{formatCop(r.amount)}</span></div>)}
    </div>
  )
  return (
    <KitShell>
      <PageHeader icon="sales" title={t('title')} actions={
        <label className="h-12 px-4 rounded-md border border-border bg-surface flex items-center gap-2 text-[15px] font-semibold text-ink">
          <span className="text-soft font-normal">{t('shift')}:</span>
          <select aria-label={t('shift')} value={shiftId ?? ''} onChange={(e) => setShiftId(Number(e.target.value))} className="bg-transparent outline-none max-w-[320px]">
            {shifts.map((s) => <option key={s.id} value={s.id}>{t('shiftLabel', { name: s.name, date: day(s.startAt) })} · {s.state === 'closed' ? t('shiftClosed') : t('shiftOpen')}</option>)}
          </select>
          <Icon name="chevronDown" size={18} className="text-soft" />
        </label>
      } />
      <div className="flex-1 min-h-0 overflow-y-auto px-5 pb-5 flex flex-col gap-4">
        {session && can.closeRegister(role) && <RegisterCard openSince={openShift ? time(openShift.startAt) : '—'} expectedCash={expectedCash}
          onClose={() => void closingData(session.id).then(setClosing)} onMove={async (type, amount, reason) => { await cashInOut(session.id, type, amount, reason); setExpectedCash((await closingData(session.id)).expectedCash) }} />}
        <div className="grid grid-cols-4 gap-4">
          <KpiTile label={t('kpi.sales')} icon="wallet" value={`$ ${formatCop(total)}`} />
          <KpiTile label={t('kpi.orders')} icon="receipt" value={current?.sales.length ?? 0} />
          <KpiTile label={t('kpi.avg')} icon="sales" value={`$ ${formatCop(current?.sales.length ? total / current.sales.length : 0)}`} />
          <KpiTile label={t('kpi.autonomous')} icon="tablet" tone="primary" value={`${current?.sales.length ? Math.round((autonomous / current.sales.length) * 100) : 0}%`} />
        </div>
        <div className="grid grid-cols-3 gap-4">
          <Card title={t('byMethod')}>
            <div className="p-5 flex flex-col gap-3">
              {(current?.methods ?? []).length === 0 && <p className="text-[14px] text-soft">{t('none')}</p>}
              {(current?.methods ?? []).map((m) => (
                <div key={m.method} className="flex flex-col gap-1.5 text-[15px]">
                  <div className="flex justify-between"><span>{m.method}</span><span className="font-semibold tabular">{formatCop(m.amount)}</span></div>
                  <div className="h-2 rounded-full bg-muted"><span className="block h-2 rounded-full bg-primary" style={{ width: `${Math.max(3, (m.amount / maxMethod) * 100)}%` }} aria-hidden /></div>
                </div>
              ))}
            </div>
          </Card>
          <Card title={t('byWaiter')}>{list((current?.waiters ?? []).map((w) => ({ key: w.waiter, label: w.waiter, meta: `${w.orders} ${t('cols.orders')}`, amount: w.amount })))}</Card>
          <Card title={t('top')}>{list((current?.top ?? []).map((p) => ({ key: p.product, label: p.product, meta: `× ${p.qty}`, amount: p.amount })))}</Card>
        </div>
        <Card title={t('orders')} className="shrink-0">
          <KitTable columns={columns} rows={current?.sales ?? []} rowKey={(s) => s.id} empty={<KitEmptyState icon="receipt" title={t('empty')} body={t('emptyBody')} />} />
        </Card>
      </div>
      {closing && session && <CloseRegisterModal data={closing} onClose={() => setClosing(null)}
        onConfirm={async (counted, notes) => { const r = await closeRegister(session.id, counted, notes); if (r.successful) setTimeout(() => void refreshSession(), 1500); return r }}
        canForce={can.forceCloseRegister(role)} onForce={async () => { const r = await forceCloseRegister(session.id); if (r.successful) setTimeout(() => void refreshSession(), 1500); return r }} />}
    </KitShell>
  )
}
