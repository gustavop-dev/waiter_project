'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react'

import { Icon } from '@/components/kit/Icon'
import { KitShell } from '@/components/kit/KitShell'
import { ChangeTableModal } from '@/components/tables/ChangeTableModal'
import { FloorEditModal } from '@/components/tables/FloorEditModal'
import { FloorInfoChip, FloorSwitcher, SelectedTableBar, TableLegend } from '@/components/tables/FloorHeader'
import { FloorPlan } from '@/components/tables/FloorPlan'
import { FloorSettingsPopover } from '@/components/tables/FloorSettingsPopover'
import { FloorWizard } from '@/components/tables/FloorWizard'
import { PayModal } from '@/components/tables/PayModal'
import { PickTablePrompt } from '@/components/tables/PickTablePrompt'
import { ReservationDetailModal } from '@/components/tables/ReservationDetailModal'
import { ReservationListModal } from '@/components/tables/ReservationListModal'
import { TableDetailModal } from '@/components/tables/TableDetailModal'
import { can } from '@/lib/domain/roles'
import { deriveTableViews } from '@/lib/domain/tableState'
import { orderCode, orderPrefix, parseFloorName, remainingByTemplate } from '@/lib/domain/tablesKit'
import { useIdentity } from '@/lib/hooks/useIdentity'
import { getOrderLines, type OrderLineView } from '@/lib/services/orders'
import { serveLines } from '@/lib/services/ordersKit'
import { listAllFloors, listFloorTables, moveOrder, reservedAtByTable, setFloorActive, type FloorSetting, type OrderDetail, type OrderDetailLine, type TableReservation } from '@/lib/services/tables'
import { useAuthStore } from '@/lib/stores/authStore'
import { useCatalogStore } from '@/lib/stores/catalogStore'
import { useFloorStore } from '@/lib/stores/floorStore'
import { useOrderStore } from '@/lib/stores/orderStore'
import { toast } from '@/lib/stores/toastStore'
import type { Table } from '@/lib/types'

type Sheet = null | 'reservations' | 'detail' | 'pay' | 'wizard'
// Las demás pantallas mandan aquí con ?elegir=mesa cuando se pulsa "Crear pedido" sin mesa elegida.
const PICK_TABLE = 'elegir'

// Fecha de hoy en la zona del dispositivo: es la que el addon usa para "la próxima reserva" de cada mesa.
const today = (): string => new Date().toLocaleDateString('en-CA')
const EMPTY_RESERVED: Record<number, TableReservation | null> = {}

// useSearchParams obliga a un límite de Suspense: se aísla aquí para no envolver la pantalla entera.
function AskedForTable({ onAsk }: { onAsk: () => void }) {
  const asked = useSearchParams().get(PICK_TABLE) === 'mesa'
  useEffect(() => { if (asked) onAsk() }, [asked, onAsk])
  return null
}

// Pantalla "Mesas" del kit CloudPos (6 – Table): plano real por piso, leyenda, barra de mesa seleccionada,
// detalle de mesa, cambio de mesa y ajustes de pisos con el editor del plano.
export default function SalonPage() {
  const t = useTranslations('tables')
  const router = useRouter()
  // Los pisos son configuración del local: un mesero no los activa ni los edita.
  const { role } = useIdentity()
  const mayManageFloors = can.manageFloors(role)
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
  const [pickTable, setPickTable] = useState(false)

  const reload = useCallback(async () => { if (session) { await load(session.id); await refreshOpenOrders(session.id) } }, [session, load, refreshOpenOrders])
  useEffect(() => {
    const id = setInterval(() => { if (session) void refreshOpenOrders(session.id) }, 30_000)
    return () => clearInterval(id)
  }, [session, refreshOpenOrders])
  useEffect(() => { if (session) { void refreshOpenOrders(session.id); void refreshShift(session.id) } }, [session, refreshOpenOrders, refreshShift])
  // Llegar aquí para elegir mesa descarta la que quedara seleccionada de antes: la elección tiene que ser de ahora.
  const askForTable = useCallback(() => {
    selectTable(null)
    setPickTable(true)
    router.replace('/salon')
  }, [selectTable, router])
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
  // Odoo se niega a tocar un piso con la caja abierta (obligaría a recalcular el turno en marcha): se explica
  // en una nota, no en una pantalla de error.
  async function toggleFloor(f: FloorSetting, active: boolean) {
    try {
      await setFloorActive(f.id, active)
      await refreshFloors()
      await reload()
    } catch (e) {
      const openSession = e instanceof Error && /PoS Session|sesión/i.test(e.message)
      toast({ title: openSession ? t('floorToggle.needsClosedSession') : t('floorToggle.failed'), body: openSession ? t('floorToggle.needsClosedSessionBody', { name: f.name }) : '', tone: 'danger' })
    }
  }

  // Entregar desde la mesa: lo mismo que marcarlo en Pedidos, guardado en Odoo. Uno o todos los que
  // cocina ya sacó al pase.
  async function serveLine(lines: OrderDetailLine[]) {
    try { await serveLines(lines.map((l) => l.id)); await reload() }
    catch { toast({ title: t('detail.deliverFailed'), tone: 'danger' }) }
  }

  if (!catalog) return null
  // Cobrar puede ser solo de caja: lo decide el restaurante en Configuración.
  const mayCharge = can.charge(role, catalog.settings.waiterCanCharge)
  // Un pedido en mesa nace de una mesa elegida a propósito: sin selección se pide antes de abrir el asistente.
  const newOrderHref = selected ? `/pedidos/nuevo?mesa=${selected.table.id}` : null
  return (
    <KitShell>
      <header className="shrink-0 h-[72px] px-4 flex items-center gap-4 border-b border-border">
        <h1 className="h-12 px-4 rounded-md bg-surface border border-border flex items-center gap-2 text-[18px] font-semibold text-ink"><Icon name="tables" size={22} />{t('title')}</h1>
        <div className="ml-auto flex items-center gap-4">
          <TableLegend />
          <FloorSwitcher floors={catalog.floors} activeId={floorId} onChange={setFloor} />
          <span aria-hidden className="w-px h-8 bg-border" />
          {/* Crear pedido vive en la barra de la mesa seleccionada: aquí arriba pedía la mesa que allí ya está elegida. */}
          {mayManageFloors && (
            <button type="button" aria-label={t('settings')} aria-expanded={settings} onClick={() => setSettings((v) => !v)} className="w-12 h-12 rounded-full border border-border bg-surface grid place-items-center text-ink"><Icon name="cog" size={22} /></button>
          )}
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
          <SelectedTableBar name={String(selected.table.number)} hasReservation={Boolean(reserved[selected.table.id])}
            onClear={() => selectTable(null)} onReservations={() => setSheet('reservations')} onDetail={() => setSheet('detail')}
            onNewOrder={() => newOrderHref && router.push(newOrderHref)} />
        )}
        <FloorSettingsPopover open={settings && mayManageFloors} onClose={() => setSettings(false)} floors={allFloors} onAdd={() => { setSettings(false); setSheet('wizard') }} onEdit={openEdit} onToggle={toggleFloor} />
      </div>
      {selected && (
        <ReservationListModal open={sheet === 'reservations' && booking === null} onClose={() => setSheet(null)} tableId={selected.table.id}
          tableName={String(selected.table.number)} onDetail={setBooking} />
      )}
      {booking && <ReservationDetailModal open onClose={() => setBooking(null)} reservationId={booking.id} />}
      {selected && (
        <TableDetailModal open={sheet === 'detail'} onClose={() => setSheet(null)} tableName={String(selected.table.number)} orderId={selected.orderId} imageFor={imageFor}
          onChangeTable={(detail) => { setSheet(null); setMoving({ detail, fromTableId: selected.table.id }) }} onNewOrder={() => newOrderHref && router.push(newOrderHref)} onPay={openPay}
          onServe={serveLine} busy={busy} mayCharge={mayCharge} />
      )}
      {moving && target !== null && (
        <ChangeTableModal open onClose={() => setTarget(null)} detail={moving.detail} busy={movingBusy} onConfirm={confirmMove}
          current={String(catalog.tables.find((x) => x.id === moving.fromTableId)?.number ?? '')} target={String(catalog.tables.find((x) => x.id === target)?.number ?? '')} />
      )}
      {selected && (
        <PayModal open={sheet === 'pay'} onClose={() => setSheet(null)} tableNumber={selected.table.number} total={selected.total} lines={payLines} methods={catalog.paymentMethods} busy={busy}
          onSettle={onSettle} receipt={receipt} onCloseReceipt={onCloseReceipt} />
      )}
      <Suspense><AskedForTable onAsk={askForTable} /></Suspense>
      <PickTablePrompt open={pickTable} onClose={() => setPickTable(false)} />
      {sheet === 'wizard' && <FloorWizard open onClose={() => setSheet(null)} floors={catalog.floors} configId={catalog.settings.configId} onCreated={async (id) => { await reload(); setFloor(id) }} />}
      {editing && <FloorEditModal open onClose={() => setEditing(null)} floor={editing.floor} tables={editing.tables} configId={catalog.settings.configId} onSaved={reload} />}
    </KitShell>
  )
}
