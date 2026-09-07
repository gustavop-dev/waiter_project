'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo, useState } from 'react'

import { KpiTile } from '@/components/dashboard/KpiTile'
import { LiveClock } from '@/components/dashboard/LiveClock'
import { OrdersColumn } from '@/components/dashboard/OrdersColumn'
import { OutOfStock } from '@/components/dashboard/OutOfStock'
import { ReadyToServe } from '@/components/dashboard/ReadyToServe'
import { TablesAvailable } from '@/components/dashboard/TablesAvailable'
import { Icon } from '@/components/kit/Icon'
import { KitShell } from '@/components/kit/KitShell'
import { formatCop } from '@/lib/domain/money'
import { greetingFor, readyToServe, sortOrders, type ReadyDish } from '@/lib/domain/orderState'
import { useIdentity } from '@/lib/hooks/useIdentity'
import { useKitOrders } from '@/lib/hooks/useKitOrders'
import { serveLines } from '@/lib/services/ordersKit'
import { useAuthStore } from '@/lib/stores/authStore'
import { useCatalogStore } from '@/lib/stores/catalogStore'
import { useOrderStore } from '@/lib/stores/orderStore'
import { toast } from '@/lib/stores/toastStore'

// Dashboard del kit (3 – Dashboard / Filled.png y Empty.png): saludo, reloj, KPIs del turno, columnas En progreso y
// Esperando pago, mesas disponibles por piso y agotados. La campana con su popover la trae otra oleada.
export default function DashboardPage() {
  const t = useTranslations('dashboard')
  // Se saluda a quien marcó su PIN, no a la credencial con la que se abrió la tablet.
  const { firstName } = useIdentity()
  const session = useAuthStore((s) => s.session)
  const catalog = useCatalogStore((s) => s.catalog)
  const shift = useOrderStore((s) => s.shift)
  const refreshShift = useOrderStore((s) => s.refreshShift)
  const { orders, loaded, refresh, statusOf, percentOf } = useKitOrders()
  const [serving, setServing] = useState(false)

  useEffect(() => {
    if (!session) return
    void refreshShift(session.id)
    const id = setInterval(() => { void refreshShift(session.id) }, 30_000)
    return () => clearInterval(id)
  }, [session, refreshShift])

  const sorted = useMemo(() => sortOrders(orders, 'latest'), [orders])
  const waiting = sorted.filter((o) => statusOf(o) === 'waiting_payment')
  const active = sorted.filter((o) => statusOf(o) !== 'waiting_payment')
  const busyTables = useMemo(() => new Set(orders.flatMap((o) => (o.tableId === null ? [] : [o.tableId]))), [orders])
  const ready = useMemo(() => readyToServe(orders), [orders])

  // Entregar desde aquí es lo mismo que marcar la casilla en el pedido: se guarda en Odoo (`served_date` de la línea).
  async function deliver(dish: ReadyDish) {
    setServing(true)
    try {
      await serveLines([dish.lineId])
      toast({ title: t('ready.delivered', { name: dish.name }) })
      await refresh()
    } catch {
      toast({ title: t('ready.failed'), tone: 'danger' })
    } finally { setServing(false) }
  }

  return (
    <KitShell>
      <div className="flex-1 min-h-0 grid grid-cols-[minmax(0,1fr)_300px] gap-4 p-4">
        <div className="min-h-0 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-[22px] font-semibold text-ink">{t(`greeting.${greetingFor(new Date().getHours())}`, { name: firstName })}</h1>
              <p className="text-[15px] text-soft">{t('motto')}</p>
            </div>
            <LiveClock label={t('clock')} />
          </div>
          <div className="grid grid-cols-4 gap-4">
            <KpiTile label={t('kpi.earning')} value={`$ ${formatCop(shift?.sales ?? 0)}`} icon="wallet" />
            <KpiTile label={t('kpi.inProgress')} value={String(orders.filter((o) => statusOf(o) === 'in_progress').length)} icon="alarm" />
            <KpiTile label={t('kpi.ready')} value={String(ready.length)} icon="chef" />
            <KpiTile label={t('kpi.completed')} value={String(shift?.orders ?? 0)} icon="fileCheck" />
          </div>
          <div className="flex-1 min-h-0 grid grid-cols-2 gap-4">
            <OrdersColumn title={t('columns.inProgress')} orders={active} statusOf={statusOf} percentOf={percentOf} loaded={loaded} empty={{ title: t('emptyInProgress.title'), body: t('emptyInProgress.body') }} />
            <OrdersColumn title={t('columns.waiting')} orders={waiting} statusOf={statusOf} percentOf={percentOf} loaded={loaded} empty={{ title: t('emptyWaiting.title'), body: t('emptyWaiting.body') }} />
          </div>
        </div>
        <div className="min-h-0 flex flex-col gap-4">
          <Link href="/salon?elegir=mesa" className="h-12 shrink-0 rounded-md bg-primary text-primary-ink text-[16px] font-bold inline-flex items-center justify-center gap-2"><Icon name="plus" size={20} />{t('createOrder')}</Link>
          <div className="flex-1 min-h-0 grid grid-rows-3 gap-4">
            <ReadyToServe dishes={ready} onServe={(d) => void deliver(d)} busy={serving} />
            <TablesAvailable floors={catalog?.floors ?? []} tables={catalog?.tables ?? []} busyTableIds={busyTables} />
            <OutOfStock products={catalog?.products ?? []} />
          </div>
        </div>
      </div>
    </KitShell>
  )
}
