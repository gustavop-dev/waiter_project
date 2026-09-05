'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

import { Shell } from '@/components/layout/Shell'
import { Topbar } from '@/components/layout/Topbar'
import { BillPanel } from '@/components/salon/BillPanel'
import { FloorTabs } from '@/components/salon/FloorTabs'
import { StateLegend } from '@/components/salon/StateLegend'
import { TableGrid } from '@/components/salon/TableGrid'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { formatCop } from '@/lib/domain/money'
import { countByState, deriveTableViews } from '@/lib/domain/tableState'
import { getOrderLines } from '@/lib/services/orders'
import type { OrderLineView } from '@/lib/services/orders'
import { useAuthStore } from '@/lib/stores/authStore'
import { useCatalogStore } from '@/lib/stores/catalogStore'
import { useFloorStore } from '@/lib/stores/floorStore'
import { useOrderStore } from '@/lib/stores/orderStore'

export default function SalonPage() {
  const t = useTranslations('pos')
  const router = useRouter()
  const session = useAuthStore((s) => s.session)
  const catalog = useCatalogStore((s) => s.catalog)
  const { activeFloorId, selectedTableId, setFloor, selectTable } = useFloorStore()
  const { openOrders, flags, draft, refreshOpenOrders, refreshShift, charge, chargeExisting, busy } = useOrderStore()
  const [remote, setRemote] = useState<{ orderId: number; lines: OrderLineView[] } | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  // Los tiempos de mesa y la barra de 22 min avanzan solos.
  // Cada 30 s: reloj de las celdas y estado de cocina (lo marca otra pantalla, vive en Odoo).
  useEffect(() => {
    const id = setInterval(() => { setNow(Date.now()); if (session) void refreshOpenOrders(session.id) }, 30_000)
    return () => clearInterval(id)
  }, [session, refreshOpenOrders])

  useEffect(() => { if (session) { void refreshOpenOrders(session.id); void refreshShift(session.id) } }, [session, refreshOpenOrders, refreshShift])
  useEffect(() => { if (catalog && activeFloorId === null && catalog.floors[0]) setFloor(catalog.floors[0].id) }, [catalog, activeFloorId, setFloor])

  const views = useMemo(() => {
    if (!catalog) return []
    const tables = catalog.tables.filter((x) => x.floorId === activeFloorId)
    return deriveTableViews(tables, openOrders, flags)
  }, [catalog, activeFloorId, openOrders, flags])
  const selected = views.find((v) => v.table.id === selectedTableId) ?? null
  const cash = catalog?.paymentMethods.find((m) => m.type === 'cash')
  const isLocal = draft !== null && draft.tableId === selectedTableId
  const remoteOrderId = !isLocal ? (selected?.orderId ?? null) : null
  // Las líneas remotas solo valen para el pedido que las pidió: lo obsoleto se descarta al leer, sin resetear estado en el efecto.
  const lines = isLocal ? draft.lines : remote?.orderId === remoteOrderId ? remote.lines : []

  // Pedido que existe en Odoo pero no se compuso aquí (otra tablet, el comensal): sus líneas se leen del servidor.
  useEffect(() => {
    if (remoteOrderId === null) return
    void getOrderLines(remoteOrderId).then((l) => setRemote({ orderId: remoteOrderId, lines: l }))
  }, [remoteOrderId])

  async function onConfirmCharge() {
    if (!cash || !selected) return
    if (isLocal) await charge(cash.id)
    else if (selected.orderId) await chargeExisting(selected.orderId, selected.table.id, selected.total, cash.id)
    setConfirming(false)
    if (session) { await refreshOpenOrders(session.id); await refreshShift(session.id) }
    selectTable(null)
  }

  if (!catalog) return null
  return (
    <Shell mode="sidebar">
      <Topbar
        left={<><span className="text-[15px] text-soft">{new Date(now).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })} · {new Date(now).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}</span><Badge tone="free"><span className="w-[7px] h-[7px] rounded-full bg-free" />{t('topbar.operational')}</Badge></>}
        right={<><Button variant="secondary" disabled>{t('topbar.search')}</Button><Button variant="primary" disabled>{t('topbar.newTable')}</Button></>}
      />
      <div className="flex-1 min-h-0 flex">
        <section className="flex-1 min-w-0 p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <FloorTabs floors={catalog.floors} activeId={activeFloorId} onChange={setFloor} />
            <StateLegend counts={countByState(views)} />
          </div>
          {views.length === 0 ? <p className="text-soft text-base">{t('salon.emptyFloor')}</p> : <TableGrid views={views} selectedId={selectedTableId} onSelect={selectTable} now={now} />}
        </section>
        <BillPanel view={selected} lines={lines} onCharge={() => setConfirming(true)} onOpenOrder={() => selected && router.push(`/mesas/${selected.table.id}`)} now={now} />
      </div>
      <ConfirmDialog open={confirming && !!selected} title={t('salon.confirmTitle', { number: selected?.table.number ?? 0 })}
        body={t('salon.confirmBody', { amount: `$ ${formatCop(selected?.total ?? 0)}`, method: cash?.name ?? '' })}
        confirmLabel={t('salon.confirmYes')} cancelLabel={t('salon.confirmNo')} onConfirm={onConfirmCharge} onCancel={() => setConfirming(false)} />
      {busy && <span className="sr-only" role="status">…</span>}
    </Shell>
  )
}
