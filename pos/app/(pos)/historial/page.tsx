'use client'

import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useState } from 'react'

import { BillInfo } from '@/components/history/BillInfo'
import { HistoryRow } from '@/components/history/HistoryRow'
import { Chip } from '@/components/kit/Chip'
import { PageTitle } from '@/components/ui/PageHeader'
import { Icon } from '@/components/kit/Icon'
import { KitEmptyState } from '@/components/kit/KitEmptyState'
import { ListSkeleton } from '@/components/kit/Skeleton'
import { filterHistory, matchesOrderSearch, type HistoryFilter, type KitLine, type KitOrder } from '@/lib/domain/orderState'
import { getKitOrderLines, listHistoryOrders } from '@/lib/services/ordersKit'
import { useCatalogStore } from '@/lib/stores/catalogStore'

const FILTERS: HistoryFilter[] = ['all', 'dine_in', 'takeout', 'delivery']

// Historial del kit (11 – Order History / Bill Selected*.png): buscador, chips por tipo, lista de pedidos pagados y panel de la cuenta.
export default function HistorialPage() {
  const t = useTranslations('history')
  const catalog = useCatalogStore((s) => s.catalog)
  const [orders, setOrders] = useState<KitOrder[]>([])
  const [loaded, setLoaded] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<HistoryFilter>('all')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [lines, setLines] = useState<{ orderId: number; lines: KitLine[] } | null>(null)
  const tableNumberOf = useCallback((id: number) => catalog?.tables.find((x) => x.id === id)?.number ?? null, [catalog])

  useEffect(() => {
    if (!catalog) return
    listHistoryOrders(tableNumberOf).then(setOrders).catch((e) => console.warn('No se pudo cargar el historial.', e)).finally(() => setLoaded(true))
  }, [catalog, tableNumberOf])
  useEffect(() => {
    if (selectedId === null) return
    void getKitOrderLines(selectedId).then((l) => setLines({ orderId: selectedId, lines: l }))
  }, [selectedId])

  const visible = useMemo(() => filterHistory(orders.filter((o) => matchesOrderSearch(o, query)), filter), [orders, query, filter])
  const selected = orders.find((o) => o.id === selectedId) ?? null

  return (
    <>
      <div className="flex-1 min-h-0 grid grid-cols-[1fr_400px] gap-4 p-4">
        <div className="min-h-0 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            <PageTitle>{t('title')}</PageTitle>
            <label className="ml-auto w-[360px] h-11 px-3 rounded-md border border-border bg-surface flex items-center gap-2 text-dim">
              <Icon name="search" size={20} />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('search')} aria-label={t('search')} className="flex-1 min-w-0 bg-transparent outline-none text-[15px] text-ink placeholder:text-dim" />
            </label>
          </div>
          <div className="flex-1 min-h-0 rounded-lg border border-border ambient-panel flex flex-col">
            <div className="p-2 flex items-center gap-2 border-b border-border shrink-0">
              {FILTERS.map((f) => <Chip key={f} label={t(`filters.${f}`)} active={f === filter} onClick={() => setFilter(f)} />)}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-2">
              {!loaded ? <ListSkeleton rows={7} />
                : visible.length === 0
                ? <KitEmptyState icon="history" title={t('noOrders')} />
                : visible.map((o) => <HistoryRow key={o.id} order={o} selected={o.id === selectedId} onSelect={() => setSelectedId(o.id)} />)}
            </div>
          </div>
        </div>
        <BillInfo order={selected} lines={lines?.orderId === selectedId ? lines.lines : []} company={catalog?.company.name ?? ''} />
      </div>
    </>
  )
}
