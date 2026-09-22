'use client'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { OrderHeadline, CustomerRow } from '@/components/orders/OrderCard'
import { OrderLocationRow } from '@/components/orders/OrderLocationRow'
import type { OrderLocation } from '@/lib/domain/orderLocation'
import type { KitOrder, KitStatus } from '@/lib/domain/orderState'
import { formatCop } from '@/lib/domain/money'
import { Button } from '@/components/ui/Button'

export function CashierOrderCard({ order, location, status, mayCharge }: { order: KitOrder; location?: OrderLocation; status: KitStatus; mayCharge: boolean }) {
  const t = useTranslations('orders')
  return <article aria-label={`Cuenta ${order.number}`} className="rounded-lg border border-border bg-surface/80 p-4 flex flex-col gap-3">
    <OrderHeadline order={order} /><CustomerRow order={order} />
    {location && <OrderLocationRow location={location} />}
    <span className="text-sm text-soft">{t(`status.${status}`)}</span>
    <details className="text-sm text-soft"><summary className="cursor-pointer min-h-11 flex items-center text-primary font-semibold">Ver consumo · {order.lines.reduce((sum, line) => sum + line.qty, 0)} ítems</summary>
      <ul className="space-y-2 max-h-48 overflow-y-auto">{order.lines.map((line) => <li key={line.id} className="flex justify-between gap-3"><span>{line.qty} × {line.name}</span><span className="shrink-0">$ {formatCop(line.total)}</span></li>)}</ul>
    </details>
    <div className="mt-auto border-t border-border pt-3 flex justify-between items-center"><span className="text-sm text-soft">Total</span><strong className="text-xl">$ {formatCop(order.total)}</strong></div>
    {mayCharge && order.lines.length > 0 ? <Link href={`/pago/${order.id}`} className="h-tap-min rounded-md bg-primary text-white font-semibold flex items-center justify-center">Cobrar</Link> : <Button size="compact" disabled>Sin permiso de cobro</Button>}
  </article>
}
