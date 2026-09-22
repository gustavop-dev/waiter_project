'use client'

import { useTranslations } from 'next-intl'

import { Button } from '@/components/ui/Button'
import { formatCop } from '@/lib/domain/money'
import type { ReceiptData } from '@/lib/stores/orderStore'

// Recibo en pantalla, listo para imprimir desde el navegador (.receipt es lo único visible al imprimir).
export function Receipt({ data, onClose }: { data: ReceiptData; onClose: () => void }) {
  const t = useTranslations('pos.pay.receipt')
  const at = new Date(data.at)
  return (
    <aside aria-label={t('title')} className="w-panel-lg shrink-0 border-l border-border bg-surface flex flex-col">
      <div className="receipt flex-1 min-h-0 overflow-y-auto px-[22px] py-5 flex flex-col gap-3 font-mono text-[14px]">
        <div className="text-center flex flex-col gap-0.5"><span className="font-sans font-bold text-lg">{data.company}</span><span className="text-soft">{t('table', { n: data.tableNumber })} · {at.toLocaleDateString('es-CO')} {at.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span><span className="text-soft">{data.reference}</span></div>
        <p className="text-center font-semibold">{t('title')}</p>
        <p className="text-center text-xs text-soft">{t('fiscalHint')}</p>
        <hr className="border-dashed border-border" />
        {data.lines.map((l) => <div key={l.uuid} className="flex justify-between gap-2"><span>{l.qty} × {l.name}</span><span className="tabular">{formatCop(l.total ?? l.qty * l.unitPrice * (1 - (l.discount ?? 0) / 100))}</span></div>)}
        <hr className="border-dashed border-border" />
        <div className="flex justify-between"><span>{t('subtotal')}</span><span className="tabular">{formatCop(data.subtotal)}</span></div>
        {data.lines.some((l) => l.discount) && <div className="flex justify-between"><span>{t('discountIncluded')}</span><span>{formatCop(data.lines.reduce((a, l) => a + l.qty * l.unitPrice * (l.discount ?? 0) / 100, 0))}</span></div>}
        <div className="flex justify-between"><span>{t('tax')}</span><span className="tabular">{formatCop(data.tax)}</span></div>
        {data.tip > 0 && <div className="flex justify-between"><span>{t('tip')}</span><span className="tabular">{formatCop(data.tip)}</span></div>}
        <div className="flex justify-between font-sans font-bold text-lg"><span>{t('total')}</span><span className="font-mono tabular">$ {formatCop(data.total)}</span></div>
        <hr className="border-dashed border-border" />
        {data.payments.map((p, i) => <div key={i} className="flex justify-between"><span>{p.method}{p.reference && ` · ${p.reference}`}</span><span className="tabular">{formatCop(p.amount)}</span></div>)}
        {data.change > 0 && <div className="flex justify-between"><span>{t('change')}</span><span className="tabular">{formatCop(data.change)}</span></div>}
        <p className="text-center text-soft pt-2">{t('thanks')}</p>
      </div>
      <footer className="px-[22px] py-4 border-t border-border bg-canvas flex gap-2.5 print:hidden">
        <Button className="flex-1" onClick={() => window.print()}>{t('print')}</Button>
        <Button variant="primary" className="flex-1" onClick={onClose}>{t('close')}</Button>
      </footer>
    </aside>
  )
}
