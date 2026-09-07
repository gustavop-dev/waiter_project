'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'

import { Icon } from '@/components/kit/Icon'
import { KitEmptyState } from '@/components/kit/KitEmptyState'
import { OrderCard } from '@/components/orders/OrderCard'
import type { KitOrder, KitStatus } from '@/lib/domain/orderState'

interface Props { title: string; orders: KitOrder[]; statusOf: (o: KitOrder) => KitStatus; percentOf: (o: KitOrder) => number; empty: { title: string; body: string }; loaded: boolean }

// Columna "In Progress" / "Waiting for Payments" del kit: título, lista de tarjetas cortas con scroll y "Ver todos" al pie.
export function OrdersColumn({ title, orders, statusOf, percentOf, empty, loaded }: Props) {
  const t = useTranslations('dashboard')
  return (
    <section aria-label={title} className="bg-surface border border-border rounded-lg flex flex-col min-h-0">
      <h2 className="px-4 h-14 flex items-center text-[18px] font-semibold text-ink shrink-0">{title}</h2>
      <div className="flex-1 min-h-0 mx-2 rounded-md border border-border bg-canvas overflow-y-auto p-3 flex flex-col gap-3">
        {loaded && orders.length === 0 ? <KitEmptyState icon="fileCheck" title={empty.title} body={empty.body} /> : orders.map((o) => <OrderCard key={o.id} order={o} status={statusOf(o)} percent={percentOf(o)} variant="dashboard" />)}
      </div>
      <Link href="/pedidos" className="h-12 shrink-0 flex items-center justify-center gap-1 text-[15px] font-semibold text-ink">{t('seeAll')}<Icon name="chevronRight" size={18} /></Link>
    </section>
  )
}
