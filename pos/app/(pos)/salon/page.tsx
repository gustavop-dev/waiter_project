'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

import { Shell } from '@/components/layout/Shell'
import { Topbar } from '@/components/layout/Topbar'
import { useOperationSubnav } from '@/components/layout/useOperationSubnav'
import { BillPanel } from '@/components/salon/BillPanel'
import { FloorTabs } from '@/components/salon/FloorTabs'
import { NewTableDialog } from '@/components/salon/NewTableDialog'
import { StateLegend } from '@/components/salon/StateLegend'
import { TableGrid } from '@/components/salon/TableGrid'
import { PayPanel } from '@/components/pay/PayPanel'
import { Receipt } from '@/components/pay/Receipt'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { countByState, deriveTableViews, matchesSearch } from '@/lib/domain/tableState'
import { saveTable } from '@/lib/services/settings'
import { getOrderLines } from '@/lib/services/orders'
import type { OrderLineView } from '@/lib/services/orders'
import { useAuthStore } from '@/lib/stores/authStore'
import { useCatalogStore } from '@/lib/stores/catalogStore'
import { useFloorStore } from '@/lib/stores/floorStore'
import { useOrderStore } from '@/lib/stores/orderStore'

export default function SalonPage() {
  const t = useTranslations('pos')
  const router = useRouter()
  const subnav = useOperationSubnav('salon')
  const session = useAuthStore((s) => s.session)
  const { catalog, load } = useCatalogStore()
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const { activeFloorId, selectedTableId, setFloor, selectTable } = useFloorStore()
  const { openOrders, flags, draft, refreshOpenOrders, refreshShift, settle, receipt, closeReceipt, busy } = useOrderStore()
  const [remote, setRemote] = useState<{ orderId: number; lines: OrderLineView[] } | null>(null)
  const [paying, setPaying] = useState(false)
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
    return deriveTableViews(tables, openOrders, flags).filter((v) => matchesSearch(v, query))
  }, [catalog, activeFloorId, openOrders, flags, query])
  const selected = views.find((v) => v.table.id === selectedTableId) ?? null
  const isLocal = draft !== null && draft.tableId === selectedTableId
  const remoteOrderId = !isLocal ? (selected?.orderId ?? null) : null
  // Las líneas remotas solo valen para el pedido que las pidió: lo obsoleto se descarta al leer, sin resetear estado en el efecto.
  const lines = isLocal ? draft.lines : remote?.orderId === remoteOrderId ? remote.lines : []

  // Pedido que existe en Odoo pero no se compuso aquí (otra tablet, el comensal): sus líneas se leen del servidor.
  useEffect(() => {
    if (remoteOrderId === null) return
    void getOrderLines(remoteOrderId).then((l) => setRemote({ orderId: remoteOrderId, lines: l }))
  }, [remoteOrderId])

  async function onSettle(plan: Parameters<typeof settle>[0]) {
    if (!selected || !catalog) return
    const ok = await settle(plan, {
      existing: isLocal ? null : selected.orderId ? { orderId: selected.orderId, tableId: selected.table.id } : null,
      tipProductId: catalog.settings.tipProductId, tableNumber: selected.table.number, company: catalog.company.name,
      lines: lines.map((l) => ({ uuid: l.uuid, name: l.name, qty: l.qty, unitPrice: l.unitPrice })), methodName: (id) => catalog.paymentMethods.find((m) => m.id === id)?.name ?? '',
    })
    if (!ok) return
    setPaying(false)
    if (session) { await refreshOpenOrders(session.id); await refreshShift(session.id) }
  }
  function onCloseReceipt() { closeReceipt(); selectTable(null) }

  if (!catalog) return null
  return (
    <Shell mode="sidebar" active="operation" subnav={subnav}>
      <Topbar
        left={<><span className="text-[15px] text-soft">{new Date(now).toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })} · {new Date(now).toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}</span><Badge tone="free"><span className="w-[7px] h-[7px] rounded-full bg-free" />{t('topbar.operational')}</Badge></>}
        right={<><input aria-label={t('topbar.search')} placeholder={t('topbar.search')} value={query} onChange={(e) => setQuery(e.target.value)} className="h-tap px-4 rounded-[10px] border border-border bg-surface text-base w-64" />
          <Button variant="primary" onClick={() => setCreating(true)} disabled={activeFloorId === null}>{t('topbar.newTable')}</Button></>}
      />
      <div className="flex-1 min-h-0 flex">
        <section className="flex-1 min-w-0 p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <FloorTabs floors={catalog.floors} activeId={activeFloorId} onChange={setFloor} />
            <StateLegend counts={countByState(views)} />
          </div>
          {views.length === 0 ? <p className="text-soft text-base">{t('salon.emptyFloor')}</p> : <TableGrid views={views} selectedId={selectedTableId} onSelect={selectTable} now={now} />}
        </section>
        {receipt ? <Receipt data={receipt} onClose={onCloseReceipt} />
          : paying && selected ? <PayPanel key={selected.table.id} tableNumber={selected.table.number} total={selected.total} lines={lines} methods={catalog.paymentMethods} busy={busy} onSettle={onSettle} onCancel={() => setPaying(false)} />
          : <BillPanel view={selected} lines={lines} onCharge={() => setPaying(true)} onOpenOrder={() => selected && router.push(`/mesas/${selected.table.id}`)} now={now} />}
      </div>
      {busy && <span className="sr-only" role="status">…</span>}
      {creating && activeFloorId !== null && (
        <NewTableDialog floorName={catalog.floors.find((f) => f.id === activeFloorId)?.name ?? ''} nextNumber={Math.max(0, ...catalog.tables.map((x) => x.number)) + 1}
          onCreate={async (n, seats) => { await saveTable(null, activeFloorId, { number: n, seats, active: true }); if (session) await load(session.id); setCreating(false) }} onCancel={() => setCreating(false)} />
      )}
    </Shell>
  )
}
