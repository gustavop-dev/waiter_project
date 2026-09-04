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
  const { openOrders, flags, draft, refreshOpenOrders, charge, busy } = useOrderStore()
  const [confirming, setConfirming] = useState(false)

  useEffect(() => { if (session) void refreshOpenOrders(session.id) }, [session, refreshOpenOrders])
  useEffect(() => { if (catalog && activeFloorId === null && catalog.floors[0]) setFloor(catalog.floors[0].id) }, [catalog, activeFloorId, setFloor])

  const views = useMemo(() => {
    if (!catalog) return []
    const tables = catalog.tables.filter((x) => x.floorId === activeFloorId)
    return deriveTableViews(tables, openOrders, flags)
  }, [catalog, activeFloorId, openOrders, flags])
  const selected = views.find((v) => v.table.id === selectedTableId) ?? null
  const cash = catalog?.paymentMethods.find((m) => m.type === 'cash')

  async function onConfirmCharge() {
    if (!cash) return
    await charge(cash.id)
    setConfirming(false)
    if (session) await refreshOpenOrders(session.id)
    selectTable(null)
  }

  if (!catalog) return null
  return (
    <Shell mode="sidebar">
      <Topbar
        left={<><span className="text-[15px] text-soft">{new Date().toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })}</span><Badge tone="free"><span className="w-[7px] h-[7px] rounded-full bg-free" />{t('topbar.operational')}</Badge></>}
        right={<><Button variant="secondary" disabled>{t('topbar.search')}</Button><Button variant="primary" disabled>{t('topbar.newTable')}</Button></>}
      />
      <div className="flex-1 min-h-0 flex">
        <section className="flex-1 min-w-0 p-6 flex flex-col gap-5">
          <div className="flex items-center justify-between gap-4">
            <FloorTabs floors={catalog.floors} activeId={activeFloorId} onChange={setFloor} />
            <StateLegend counts={countByState(views)} />
          </div>
          {views.length === 0 ? <p className="text-soft text-base">{t('salon.emptyFloor')}</p> : <TableGrid views={views} selectedId={selectedTableId} onSelect={selectTable} />}
        </section>
        <BillPanel view={selected} lines={draft?.tableId === selectedTableId ? draft.lines : []} onCharge={() => setConfirming(true)} onOpenOrder={() => selected && router.push(`/mesas/${selected.table.id}`)} />
      </div>
      <ConfirmDialog open={confirming && !!selected} title={t('salon.confirmTitle', { number: selected?.table.number ?? 0 })}
        body={t('salon.confirmBody', { amount: `$ ${formatCop(selected?.total ?? 0)}`, method: cash?.name ?? '' })}
        confirmLabel={t('salon.confirmYes')} cancelLabel={t('salon.confirmNo')} onConfirm={onConfirmCharge} onCancel={() => setConfirming(false)} />
      {busy && <span className="sr-only" role="status">…</span>}
    </Shell>
  )
}
