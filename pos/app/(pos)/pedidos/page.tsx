'use client'

import { fireUnsentLines } from '@/lib/services/kitchen'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useCallback, useMemo, useState } from 'react'

import { Chip } from '@/components/kit/Chip'
import { Icon } from '@/components/kit/Icon'
import { KitEmptyState } from '@/components/kit/KitEmptyState'
import { KitShell } from '@/components/kit/KitShell'
import { templateImage } from '@/components/orders/format'
import { OrderCard } from '@/components/orders/OrderCard'
import { OrderDetailModal } from '@/components/orders/OrderDetailModal'
import { SortMenu } from '@/components/orders/SortMenu'
import { countByStatus, filterOrders, lineGroup, matchesOrderSearch, sortOrders, type KitLine, type KitOrder, type OrdersFilter, type OrdersSort } from '@/lib/domain/orderState'
import { can } from '@/lib/domain/roles'
import { useIdentity } from '@/lib/hooks/useIdentity'
import { useKitOrders } from '@/lib/hooks/useKitOrders'
import { cancelLines, serveLines } from '@/lib/services/ordersKit'
import { useCatalogStore } from '@/lib/stores/catalogStore'
import { toast } from '@/lib/stores/toastStore'

const FILTERS: OrdersFilter[] = ['all', 'in_progress', 'ready', 'waiting_payment']

// Pantalla "Order" del kit (Ipad View / Sorting / Detail Order): buscador, chips por estado, orden y rejilla de tarjetas.
export default function PedidosPage() {
  const t = useTranslations('orders')
  const catalog = useCatalogStore((s) => s.catalog)
  const { role } = useIdentity()
  // Cobrar puede ser solo de caja: lo decide el restaurante en Configuración.
  const mayCharge = can.charge(role, catalog?.settings.waiterCanCharge ?? true)
  const { orders, loaded, refresh, statusOf, percentOf } = useKitOrders()
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<OrdersFilter>('all')
  const [sort, setSort] = useState<OrdersSort>('latest')
  const [detailId, setDetailId] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  const searched = useMemo(() => orders.filter((o) => matchesOrderSearch(o, query)), [orders, query])
  const counts = useMemo(() => countByStatus(searched, statusOf), [searched, statusOf])
  const visible = useMemo(() => sortOrders(filterOrders(searched, filter, statusOf), sort), [searched, filter, sort, statusOf])
  const detail = detailId === null ? null : orders.find((o) => o.id === detailId) ?? null
  const imageOf = useCallback((productId: number) => {
    const p = catalog?.products.find((x) => x.id === productId)
    return p?.hasImage ? templateImage(p.templateId) : null
  }, [catalog])

  // Marcar un plato lo entrega en Odoo (`action_kitchen_line_served`), no en la memoria de esta tablet: así lo
  // ve el resto del salón y sobrevive a una recarga. Solo se entrega lo que cocina marcó listo; el servidor
  // lo comprueba otra vez, porque hay tres pantallas que lo ofrecen.
  async function toggleLine(order: KitOrder, line: KitLine) {
    if (lineGroup(order, line) !== 'ready') return
    setBusy(true)
    try {
      await serveLines([line.id])
      await refresh()
    } catch {
      toast({ title: t('card.serveFailed'), tone: 'danger' })
    } finally { setBusy(false) }
  }

  // "Entregar" desde el detalle: el mesero llegó a la mesa con toda la tanda que cocina tenía en el pase.
  async function serveReady(lines: KitLine[]) {
    setBusy(true)
    try { await serveLines(lines.map((l) => l.id)); await refresh() }
    catch { toast({ title: t('card.serveFailed'), tone: 'danger' }) }
    finally { setBusy(false) }
  }

  async function sendPending(order: KitOrder) {
    setBusy(true)
    try { await fireUnsentLines(order.id); await refresh() }
    catch (e) { toast({ title: e instanceof Error ? e.message : 'No se pudo enviar', tone: 'danger' }) }
    finally { setBusy(false) }
  }

  async function cancelWaiting(order: KitOrder, lines: KitLine[]) {
    setBusy(true)
    try { await cancelLines(order.id, lines.map((l) => l.id)); toast({ title: t('detail.cancelled'), body: t('detail.cancelledBody') }); await refresh() } catch (e) { toast({ title: e instanceof Error ? e.message : 'No se pudo cancelar', tone: 'danger' }); await refresh() } finally { setBusy(false) }
  }

  return (
    <KitShell>
      <div className="flex-1 min-h-0 flex flex-col px-4 pt-4 gap-4">
        <div className="flex items-center gap-4">
          <span className="h-12 px-4 rounded-md bg-muted inline-flex items-center gap-2 text-[18px] font-semibold text-ink"><Icon name="orders" size={20} />{t('title')}</span>
          <label className="ml-auto w-[440px] h-11 px-3 rounded-md border border-border bg-surface flex items-center gap-2 text-dim">
            <Icon name="search" size={20} />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('search')} aria-label={t('search')} className="flex-1 min-w-0 bg-transparent outline-none text-[15px] text-ink placeholder:text-dim" />
          </label>
          <span className="w-px h-8 bg-border" />
          <Link href="/salon?elegir=mesa" className="h-11 px-4 rounded-md bg-primary text-primary-ink text-[15px] font-bold inline-flex items-center gap-1.5"><Icon name="plus" size={18} />{t('createOrder')}</Link>
        </div>
        <div className="flex items-center gap-2">
          {FILTERS.map((f) => <Chip key={f} label={t(`filters.${f}`)} count={counts[f]} active={f === filter} onClick={() => setFilter(f)} />)}
          <span className="ml-auto"><SortMenu value={sort} onChange={setSort} /></span>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto pb-4">
          {loaded && visible.length === 0
            ? <KitEmptyState icon="orders" title={t('empty.title')} body={t('empty.body')} />
            : <div className="grid grid-cols-3 gap-4">
              {visible.map((o) => (
                <OrderCard key={o.id} order={o} status={statusOf(o)} percent={percentOf(o)} mayCharge={mayCharge}
                  onToggleLine={(l) => { if (!busy) void toggleLine(o, l) }} onDetails={() => setDetailId(o.id)} />
              ))}
            </div>}
        </div>
      </div>
      <OrderDetailModal order={detail} status={detail ? statusOf(detail) : 'in_progress'} percent={detail ? percentOf(detail) : 0} onClose={() => setDetailId(null)} mayCharge={mayCharge}
        imageOf={imageOf} busy={busy} onSendPending={() => { if (detail) void sendPending(detail) }} onCancelWaiting={(lines) => { if (detail) void cancelWaiting(detail, lines) }}
        onServeReady={(lines) => { if (!busy) void serveReady(lines) }} />
    </KitShell>
  )
}
