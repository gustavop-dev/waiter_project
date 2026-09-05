'use client'

import { useTranslations } from 'next-intl'

import { DataTable, type Column } from '@/components/ui/DataTable'
import { orderStatus, type OrderStatus } from '@/lib/domain/ops'
import { formatCop } from '@/lib/domain/money'
import type { ShiftOrder } from '@/lib/services/ops'
import { cn } from '@/lib/utils'

const CHIP: Record<OrderStatus, string> = {
  late: 'bg-busy-soft text-busy-ink', pending: 'bg-pending-soft text-pending-ink', cooking: 'bg-kitchen-soft text-kitchen-ink',
  ready: 'bg-kitchen-soft text-kitchen-ink', served: 'bg-muted text-soft', paid: 'bg-free-soft text-free-ink',
}

export function ShiftTable({ orders, now, lateMinutes, emptyText }: { orders: ShiftOrder[]; now: number; lateMinutes: number; emptyText: string }) {
  const t = useTranslations('pos.ops')
  const columns: Column<ShiftOrder>[] = [
    { key: 'ref', header: t('cols.order'), width: '90px', render: (o) => <code className="font-mono text-soft">#{o.id}</code> },
    { key: 'table', header: t('cols.table'), render: (o) => `${o.tableNumber !== null ? `Mesa ${o.tableNumber}` : t('delivery')} · ${o.waiter}` },
    { key: 'origin', header: t('cols.origin'), width: '110px', render: (o) => <span className={cn(o.origin === 'waiter' ? 'text-soft' : 'text-brand-600 font-bold')}>{t(`origin.${o.origin}`)}</span> },
    { key: 'total', header: t('cols.total'), width: '130px', align: 'right', render: (o) => <span className="font-mono tabular">{formatCop(o.total)}</span> },
    { key: 'state', header: t('cols.state'), width: '150px', align: 'right', render: (o) => {
      const { status, minutes } = orderStatus(o, now, lateMinutes)
      return <span className={cn('inline-flex items-center h-[30px] px-2.5 rounded-lg text-sm font-medium', CHIP[status])}>{t(`status.${status}`, { n: minutes })}</span>
    } },
  ]
  return <DataTable columns={columns} rows={orders} rowKey={(o) => o.id} emptyText={emptyText} />
}
