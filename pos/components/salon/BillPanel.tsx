'use client'

import { useTranslations } from 'next-intl'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Money } from '@/components/ui/Money'
import { formatCop } from '@/lib/domain/money'
import type { DraftLine } from '@/lib/domain/order'
import { elapsedMinutes, formatElapsed } from '@/lib/domain/tableState'
import type { TableView } from '@/lib/domain/tableState'

interface BillPanelProps { view: TableView | null; lines: DraftLine[]; onCharge: () => void; onOpenOrder: () => void; now: number }

export function BillPanel({ view, lines, onCharge, onOpenOrder, now }: BillPanelProps) {
  const t = useTranslations('pos.salon')
  if (!view) {
    return <aside className="w-panel shrink-0 border-l border-border bg-surface grid place-items-center text-soft text-[15px] p-6 text-center">{t('emptyPanel')}</aside>
  }
  const subtotal = lines.reduce((a, l) => a + l.unitPrice * l.qty, 0)
  const service = Math.round(subtotal * 0.1)
  const total = view.total || subtotal
  const hasBill = lines.length > 0 || view.orderId !== null
  const meta = view.startedAt
    ? t('meta', { pax: view.table.seats, waiter: view.waiter ?? '', elapsed: formatElapsed(elapsedMinutes(view.startedAt, now)) })
    : t('pax', { count: view.table.seats })
  return (
    <aside className="w-panel shrink-0 border-l border-border bg-surface flex flex-col">
      {/* La cabecera es el acceso al pedido: tocar "Mesa N" abre la toma de pedido. */}
      <button type="button" onClick={onOpenOrder} className="p-5 border-b border-muted flex items-center justify-between text-left w-full hover:bg-canvas">
        <div className="flex flex-col gap-1">
          <span className="text-[26px] font-bold leading-none">{t('table', { number: view.table.number })}</span>
          <span className="text-sm text-soft">{meta}</span>
        </div>
        <Badge tone={view.state === 'billing' ? 'brand' : view.state === 'free' ? 'free' : 'neutral'}>{t(`legend.${view.state}`)}</Badge>
      </button>
      <div className="flex-1 min-h-0 px-5 py-1.5 overflow-auto">
        {lines.map((l) => (
          <div key={l.uuid} className="grid grid-cols-[26px_1fr_auto] gap-3 py-3.5 text-[17px] border-b border-muted">
            <span className="font-mono text-ink-3">{l.qty}</span><span>{l.name}</span><Money amount={l.unitPrice * l.qty} />
          </div>
        ))}
      </div>
      {hasBill ? (
        <div className="p-4.5 border-t border-muted bg-canvas">
          <div className="flex justify-between text-[15px] text-soft py-0.5"><span>{t('subtotal')}</span><Money amount={subtotal} /></div>
          <div className="flex justify-between text-[15px] text-soft py-0.5"><span>{t('service')}</span><Money amount={service} /></div>
          <div className="flex justify-between items-baseline pt-3 mt-2 border-t border-border">
            <span className="text-xl font-bold">{t('total')}</span><Money amount={total} withSymbol className="text-4xl" />
          </div>
          <div className="grid grid-cols-2 gap-2.5 mt-4">
            <Button disabled>{t('split')}</Button>
            <Button disabled>{t('print')}</Button>
          </div>
          <Button variant="primary" size="money" className="w-full mt-2.5" onClick={onCharge} disabled={lines.length === 0}>
            {t('charge', { amount: `$ ${formatCop(total)}` })}
          </Button>
        </div>
      ) : (
        /* Mesa libre: el diseño nunca muestra una cuenta en cero. Una sola acción Brasa: abrir el pedido. */
        <div className="p-4.5 border-t border-muted bg-canvas">
          <Button variant="primary" size="money" className="w-full" onClick={onOpenOrder}>{t('openOrder')}</Button>
        </div>
      )}
    </aside>
  )
}
