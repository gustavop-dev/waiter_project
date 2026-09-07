'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { Icon } from '@/components/kit/Icon'
import { KitShell } from '@/components/kit/KitShell'
import { ChangeTableModal } from '@/components/tables/ChangeTableModal'
import { FloorEditModal } from '@/components/tables/FloorEditModal'
import { FloorInfoChip, FloorSwitcher, SelectedTableBar, TableLegend } from '@/components/tables/FloorHeader'
import { FloorPlan } from '@/components/tables/FloorPlan'
import { FloorSettingsPopover } from '@/components/tables/FloorSettingsPopover'
import { FloorWizard } from '@/components/tables/FloorWizard'
import { PayModal } from '@/components/tables/PayModal'
import { ReservationDetailModal } from '@/components/tables/ReservationDetailModal'
import { ReservationListModal } from '@/components/tables/ReservationListModal'
import { TableDetailModal } from '@/components/tables/TableDetailModal'
import { deriveTableViews } from '@/lib/domain/tableState'
import { orderCode, orderPrefix, parseFloorName, remainingByTemplate } from '@/lib/domain/tablesKit'
import { getOrderLines, type OrderLineView } from '@/lib/services/orders'
import { listAllFloors, listFloorTables, moveOrder, reservedAtByTable, setFloorActive, type FloorSetting, type OrderDetail, type TableReservation } from '@/lib/services/tables'
import { useAuthStore } from '@/lib/stores/authStore'
import { useCatalogStore } from '@/lib/stores/catalogStore'
import { useFloorStore } from '@/lib/stores/floorStore'
import { useOrderStore } from '@/lib/stores/orderStore'
import { toast } from '@/lib/stores/toastStore'
import type { Table } from '@/lib/types'

type Sheet = null | 'reservations' | 'detail' | 'pay' | 'wizard'

// Fecha de hoy en la zona del dispositivo: es la que el addon usa para "la próxima reserva" de cada mesa.
const today = (): string => new Date().toLocaleDateString('en-CA')
const EMPTY_RESERVED: Record<number, TableReservation | null> = {}

// Pantalla "Mesas" del kit CloudPos (6 – Table): plano real por piso, leyenda, barra de mesa seleccionada,
// detalle de mesa, cambio de mesa y ajustes de pisos con el editor del plano.
export default function SalonPage() {
  const t = useTranslations('tables')
  const router = useRouter()
  const session = useAuthStore((s) => s.session)
  const { catalog, load } = useCatalogStore()
  const { activeFloorId, selectedTableId, setFloor, selectTable } = useFloorStore()
  const { openOrders, calls, flags, refreshOpenOrders, refreshShift, settle, receipt, closeReceipt, busy } = useOrderStore()
  const [sheet, setSheet] = useState<Sheet>(null)
  const [settings, setSettings] = useState(false)
  const [allFloors, setAllFloors] = useState<FloorSetting[]>([])
  const [editing, setEditing] = useState<{ floor: FloorSetting; tables: Table[] } | null>(null)
  const [moving, setMoving] = useState<{ detail: OrderDetail; fromTableId: number } | null>(null)
  const [target, setTarget] = useState<number | null>(null)
  const [payLines, setPayLines] = useState<OrderLineView[]>([])
  const [loadedReserved, setLoadedReserved] = useState<{ key: string; map: Record<number, TableReservation | null> } | null>(null)
  const [booking, setBooking] = useState<TableReservation | null>(null)
  const [movingBusy, setMovingBusy] = useState(false)

  const reload = useCallback(async () => { if (session) { await load(session.id); await refreshOpenOrders(session.id) } }, [session, load, refreshOpenOrders])
  useEffect(() => {
    const id = setInterval(() => { if (session) void refreshOpenOrders(session.id) }, 30_000)
    return () => clearInterval(id)
  }, [session, refreshOpenOrders])
  useEffect(() => { if (session) { void refreshOpenOrders(session.id); void refreshShift(session.id) } }, [session, refreshOpenOrders, refreshShift])
  const refreshFloors = useCallback(async () => { if (catalog) setAllFloors(await listAllFloors(catalog.settings.configId)) }, [catalog])
  const configId = catalog?.settings.configId ?? null
  useEffect(() => {
    if (!settings || configId === null) return
    let alive = true
    void listAllFloors(configId).then((f) => { if (alive) setAllFloors(f) })
    return () => { alive = false }
  }, [settings, configId])

  // Piso mostrado: el elegido si sigue existiendo, si no el primero del catálogo (sin escribir en el store).
  const floorId = catalog && activeFloorId !== null && catalog.floors.some((f) => f.id === activeFloorId) ? activeFloorId : catalog?.floors[0]?.id ?? null
  const views = useMemo(() => (catalog ? deriveTableViews(catalog.tables.filter((x) => x.floorId === floorId), openOrders, flags, calls) : []), [catalog, floorId, openOrders, flags, calls])
  // Reservas del día por mesa: pintan la mesa en tinta con su hora, como en el kit.
  const tableIds = useMemo(() => views.map((v) => v.table.id).join(','), [views])
  useEffect(() => {
    if (tableIds === '') return
    let alive = true
    const ids = tableIds.split(',').map(Number)
    void reservedAtByTable(ids, today()).then((r) => { if (alive) setLoadedReserved({ key: tableIds, map: r }) })
      .catch(() => { if (alive) setLoadedReserved({ key: tableIds, map: {} }) })
    return () => { alive = false }
  }, [tableIds])
  const reserved = loadedReserved?.key === tableIds ? loadedReserved.map : EMPTY_RESERVED
  const selected = views.find((v) => v.table.id === selectedTableId) ?? null
  const floor = catalog?.floors.find((f) => f.id === floorId) ?? null
  const imageFor = useCallback((productId: number) => { const p = catalog?.products.find((x) => x.id === productId); return p?.hasImage ? `/odoo/web/image/product.template/${p.templateId}/image_512` : null }, [catalog])
  const codeFor = useCallback((v: (typeof views)[number]) => { const o = openOrders.find((x) => x.id === v.orderId); return o ? orderCode('DI', o.tracking, o.id) : null }, [openOrders])

  function onSelect(id: number) {
    if (moving) { setTarget(id); return }
    selectTable(id === selectedTableId ? null : id)
  }
  async function confirmMove() {
    if (!moving || target === null || !catalog) return
    const to = catalog.tables.find((x) => x.id === target)
    setMovingBusy(true)
    try {
      await moveOrder(moving.detail.id, target)
      toast({ title: t('change.done', { name: String(to?.number ?? '') }) })
      setMoving(null); setTarget(null); selectTable(target)
      await reload()
    } catch (e) {
      toast({ title: e instanceof Error && e.message.includes('pedido') ? t('change.busy', { name: String(to?.number ?? '') }) : t('change.failed'), tone: 'danger' })
      setTarget(null)
    } finally { setMovingBusy(false) }
  }
  async function openPay(detail: OrderDetail) { setPayLines(await getOrderLines(detail.id)); setSheet('pay') }
  async function onSettle(plan: Parameters<typeof settle>[0]) {
    if (!selected || !catalog || selected.orderId === null) return
    const ok = await settle(plan, {
      existing: { orderId: selected.orderId, tableId: selected.table.id }, tipProductId: catalog.settings.tipProductId, tableNumber: selected.table.number, company: catalog.company.name,
      lines: payLines.map((l) => ({ uuid: l.uuid, name: l.name, qty: l.qty, unitPrice: l.unitPrice })), methodName: (id) => catalog.paymentMethods.find((m) => m.id === id)?.name ?? '',
    })
    if (ok) await reload()
  }
  function onCloseReceipt() { closeReceipt(); setSheet(null); selectTable(null) }
  async function openEdit(f: FloorSetting) { setSettings(false); setEditing({ floor: f, tables: await listFloorTables(f.id) }) }
  async function toggleFloor(f: FloorSetting, active: boolean) { await setFloorActive(f.id, active); await refreshFloors(); await reload() }

  if (!catalog) return null
  const newOrderHref = selected ? `/pedidos/nuevo?mesa=${selected.table.id}` : '/pedidos/nuevo'
  return (
    <KitShell>
      <header className="shrink-0 h-[72px] px-4 flex items-center gap-4 border-b border-border">
        <h1 className="h-12 px-4 rounded-md bg-surface border border-border flex items-center gap-2 text-[18px] font-semibold text-ink"><Icon name="tables" size={22} />{t('title')}</h1>
        <div className="ml-auto flex items-center gap-4">
          <TableLegend />
          <FloorSwitcher floors={catalog.floors} activeId={floorId} onChange={setFloor} />
          <span aria-hidden className="w-px h-8 bg-border" />
          <Link href={newOrderHref} className="h-12 px-4 rounded-md bg-primary text-primary-ink flex items-center gap-2 text-[16px] font-semibold"><Icon name="plus" size={20} />{t('createOrder')}</Link>
          <button type="button" aria-label={t('settings')} aria-expanded={settings} onClick={() => setSettings((v) => !v)} className="w-12 h-12 rounded-full border border-border bg-surface grid place-items-center text-ink"><Icon name="cog" size={22} /></button>
        </div>
      </header>
      <div className="relative flex-1 min-h-0 flex flex-col">
        {floor && <FloorInfoChip type={parseFloorName(floor.name).type} remaining={remainingByTemplate(views.filter((v) => !reserved[v.table.id]))} />}
        <FloorPlan views={views} selectedId={moving ? moving.fromTableId : selectedTableId} onSelect={onSelect} pickFree={moving !== null} codeFor={codeFor} reserved={reserved}
          background={floor?.hasBackground ? `/odoo/web/image/restaurant.floor/${floor.id}/floor_background_image` : null} />
        {moving ? (
          <div role="toolbar" aria-label={t('change.title')} className="absolute left-1/2 -translate-x-1/2 bottom-8 z-20 h-14 pl-4 pr-1.5 rounded-md bg-overlay text-[#F7F7F7] shadow-xl flex items-center gap-3 whitespace-nowrap text-[15px] font-semibold">
            <span>{t('selected.moving', { code: orderCode(orderPrefix(moving.detail.serviceAt), moving.detail.tracking, moving.detail.id) })}</span>
            <button type="button" onClick={() => { setMoving(null); setTarget(null) }} className="h-11 px-3.5 rounded-sm bg-[#F7F7F7] text-[#0F172A] flex items-center gap-2"><Icon name="close" size={18} />{t('selected.cancelMove')}</button>
          </div>
        ) : selected && (
          <SelectedTableBar name={String(selected.table.number)} onClear={() => selectTable(null)} onReservations={() => setSheet('reservations')} onDetail={() => setSheet('detail')} />
        )}
        <FloorSettingsPopover open={settings} onClose={() => setSettings(false)} floors={allFloors} onAdd={() => { setSettings(false); setSheet('wizard') }} onEdit={openEdit} onToggle={toggleFloor} />
      </div>
      {selected && (
        <ReservationListModal open={sheet === 'reservations' && booking === null} onClose={() => setSheet(null)} tableId={selected.table.id}
          tableName={String(selected.table.number)} onDetail={setBooking} />
      )}
      {booking && <ReservationDetailModal open onClose={() => setBooking(null)} reservationId={booking.id} />}
      {selected && (
        <TableDetailModal open={sheet === 'detail'} onClose={() => setSheet(null)} tableName={String(selected.table.number)} orderId={selected.orderId} imageFor={imageFor}
          onChangeTable={(detail) => { setSheet(null); setMoving({ detail, fromTableId: selected.table.id }) }} onNewOrder={() => router.push(newOrderHref)} onPay={openPay} />
      )}
      {moving && target !== null && (
        <ChangeTableModal open onClose={() => setTarget(null)} detail={moving.detail} busy={movingBusy} onConfirm={confirmMove}
          current={String(catalog.tables.find((x) => x.id === moving.fromTableId)?.number ?? '')} target={String(catalog.tables.find((x) => x.id === target)?.number ?? '')} />
      )}
      {selected && (
        <PayModal open={sheet === 'pay'} onClose={() => setSheet(null)} tableNumber={selected.table.number} total={selected.total} lines={payLines} methods={catalog.paymentMethods} busy={busy}
          onSettle={onSettle} receipt={receipt} onCloseReceipt={onCloseReceipt} />
      )}
      {sheet === 'wizard' && <FloorWizard open onClose={() => setSheet(null)} floors={catalog.floors} configId={catalog.settings.configId} onCreated={async (id) => { await reload(); setFloor(id) }} />}
      {editing && <FloorEditModal open onClose={() => setEditing(null)} floor={editing.floor} tables={editing.tables} configId={catalog.settings.configId} onSaved={reload} />}
    </KitShell>
  )
}
