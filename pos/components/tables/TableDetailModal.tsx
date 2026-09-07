'use client'

import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { Icon } from '@/components/kit/Icon'
import { Modal } from '@/components/kit/Modal'
import { Button } from '@/components/ui/Button'
import { formatCop } from '@/lib/domain/money'
import { orderCode, orderPrefix, progressPercent } from '@/lib/domain/tablesKit'
import { getOrderDetail, type OrderDetail, type OrderDetailLine } from '@/lib/services/tables'
import { cn } from '@/lib/utils'

interface Props {
  open: boolean; onClose: () => void; tableName: string; orderId: number | null; imageFor: (productId: number) => string | null
  onChangeTable: (detail: OrderDetail) => void; onNewOrder: () => void; onPay: (detail: OrderDetail) => void; load?: (orderId: number) => Promise<OrderDetail>
}

// date_order llega en UTC sin zona; se muestra como "lun, 17 feb 12:24 p. m." en la hora del dispositivo.
export function formatOrderDate(s: string): string {
  const d = new Date(s.replace(' ', 'T') + 'Z')
  return `${d.toLocaleDateString('es-CO', { weekday: 'short', day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' })}`
}

// Anillo de progreso del kit: arco naranja sobre pista clara, porcentaje dentro.
function Ring({ percent }: { percent: number }) {
  const r = 11, c = 2 * Math.PI * r
  return (
    <span className="relative w-8 h-8 grid place-items-center" role="img" aria-label={`${percent}%`}>
      <svg viewBox="0 0 28 28" className="absolute inset-0 -rotate-90 w-8 h-8"><circle cx="14" cy="14" r={r} fill="none" strokeWidth="3" className="stroke-progress/25" /><circle cx="14" cy="14" r={r} fill="none" strokeWidth="3" strokeLinecap="round" className="stroke-progress" strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)} /></svg>
      <span className="text-[9px] font-semibold text-progress-ink">{percent}%</span>
    </span>
  )
}

function LineCard({ line, image, t }: { line: OrderDetailLine; image: string | null; t: ReturnType<typeof useTranslations<'tables.detail'>> }) {
  const ts = useTranslations('tables.state')
  const served = line.status === 'served'
  return (
    <li className="rounded-md border border-border overflow-hidden bg-surface">
      <div className={cn('h-9 px-3 flex items-center gap-2 text-[14px] font-semibold', served ? 'bg-success-soft text-success-ink' : 'bg-progress-soft text-progress-ink')}>
        <Icon name={served ? 'checkFilled' : 'alarm'} size={18} />{served ? ts('served') : `${ts('inProgress')} •`}
      </div>
      <div className="p-3 flex gap-3">
        <span className="w-20 h-20 shrink-0 rounded-sm bg-muted overflow-hidden grid place-items-center text-dim">{image ? <img src={image} alt="" className="w-full h-full object-cover" /> : <Icon name="photo" size={22} />}</span>
        <div className="min-w-0 flex flex-col gap-1 text-[13px] text-dim">
          <span className="text-[15px] font-semibold text-ink">{line.name}</span>
          {line.additions.length > 0 && <span>{t('addition')} {line.additions.join(', ')}</span>}
          {line.note && <span>{t('note')} {line.note}</span>}
        </div>
      </div>
      <div className="px-3 pb-3 flex items-center justify-between"><span className="text-[15px] font-semibold text-ink">$ {formatCop(line.unitPrice)}</span><span className="h-8 px-2.5 rounded-sm border border-border text-[14px] font-semibold text-ink grid place-items-center">x{line.qty}</span></div>
    </li>
  )
}

// Modal "Detalle de mesa" del kit (Detail Table/Food In Progress.png y Food All Served.png).
export function TableDetailModal({ open, onClose, tableName, orderId, imageFor, onChangeTable, onNewOrder, onPay, load = getOrderDetail }: Props) {
  const t = useTranslations('tables.detail')
  const ts = useTranslations('tables.state')
  const [loaded, setLoaded] = useState<OrderDetail | null>(null)
  useEffect(() => {
    if (!open || orderId === null) return
    let alive = true
    void load(orderId).then((d) => { if (alive) setLoaded(d) })
    return () => { alive = false }
  }, [open, orderId, load])
  // Mientras llega el pedido pedido, el del anterior no se muestra: se compara con el id que se está pidiendo.
  const detail = loaded !== null && loaded.id === orderId ? loaded : null

  const allServed = detail !== null && detail.lines.length > 0 && detail.lines.every((l) => l.status === 'served')
  const inProgress = detail !== null && detail.lines.some((l) => l.status === 'progress')
  const percent = detail ? progressPercent(detail.served, detail.sent) : 0
  const code = detail ? orderCode(orderPrefix(detail.serviceAt), detail.tracking, detail.id) : ''

  const footer = (
    <div className="flex flex-col gap-3">
      {detail && <div className="h-11 px-3 rounded-sm bg-muted flex items-center justify-between text-[15px]"><span className="text-soft">{t('total')}</span><span className="text-[20px] font-semibold text-ink">$ {formatCop(detail.total)}</span></div>}
      <div className="flex gap-3">
        <Button className="flex-1" onClick={onNewOrder}><Icon name="plus" size={18} />{t('newOrder')}</Button>
        <Button variant="primary" className="flex-1" disabled={!allServed} onClick={() => detail && onPay(detail)} title={allServed ? undefined : t('payHint')}><Icon name="wallet" size={18} />{t('pay')}</Button>
      </div>
    </div>
  )

  return (
    <Modal open={open} onClose={onClose} title={t('title')} footer={footer}>
      {orderId === null ? (
        <div className="p-8 text-center flex flex-col items-center gap-2">
          <span className="w-12 h-12 rounded-sm bg-primary text-primary-ink grid place-items-center text-[16px] font-semibold">{tableName}</span>
          <p className="text-[18px] font-semibold text-ink">{t('emptyTitle')}</p><p className="text-[14px] text-soft">{t('emptyBody', { name: tableName })}</p>
        </div>
      ) : !detail ? <p role="status" className="p-8 text-center text-soft">{t('loading')}</p> : (
        <div className="px-4 pb-4 flex flex-col gap-3">
          <div className="mt-4 h-9 px-3 rounded-sm bg-muted flex items-center justify-between text-[13px] text-soft">
            <span>{t('order')} <strong className="text-ink">{code}</strong> / <strong className="text-ink">{t(`type.${orderPrefix(detail.serviceAt)}`)}</strong></span>
            <span>{formatOrderDate(detail.dateOrder)}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 shrink-0 rounded-sm bg-primary text-primary-ink grid place-items-center text-[15px] font-semibold">{tableName}</span>
            <div className="flex-1 min-w-0 flex flex-col"><span className="text-[13px] text-dim">{t('customer')}</span><span className="text-[15px] font-semibold text-ink truncate">{detail.customerName || t('noCustomer')}</span></div>
            {inProgress ? (
              <Button size="compact" className="border-primary text-primary" onClick={() => onChangeTable(detail)}><Icon name="exchange" size={18} />{t('changeTable')}</Button>
            ) : (
              <span className="flex-1 h-11 px-3 rounded-sm bg-success-soft text-success-ink flex items-center gap-2 text-[14px] font-semibold"><Icon name="check" size={16} />{ts('served')}<span className="ml-auto">{t('items', { count: detail.lines.length })}</span><Icon name="arrowRight" size={16} /></span>
            )}
          </div>
          {inProgress && (
            <div className="h-11 px-3 rounded-sm bg-progress-soft text-progress-ink flex items-center gap-2 text-[14px] font-semibold">
              <Ring percent={percent} /><span>{ts('inProgress')} •</span><span className="ml-auto">{t('items', { count: detail.lines.length })}</span><Icon name="arrowRight" size={16} />
            </div>
          )}
          <ul className="flex flex-col gap-3">{detail.lines.map((l) => <LineCard key={l.id} line={l} image={imageFor(l.productId)} t={t} />)}</ul>
        </div>
      )}
    </Modal>
  )
}
