'use client'

import { useTranslations } from 'next-intl'

import { Icon } from '@/components/kit/Icon'
import { Button } from '@/components/ui/Button'
import { formatCop } from '@/lib/domain/money'

export interface PaidSummary { total: number; methodName: string; received: number; change: number }

// "Payment Successful!" del kit (Cash / Success Payment.png): check azul, detalle del pago, Imprimir y Listo.
export function PaymentSuccess({ summary, onPrint, onDone }: { summary: PaidSummary; onPrint: () => void; onDone: () => void }) {
  const t = useTranslations('payment')
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-overlay/60 p-6">
      <div role="dialog" aria-modal="true" aria-label={t('successTitle')} className="w-[480px] max-w-full bg-surface rounded-xl shadow-xl overflow-hidden">
        <div className="px-6 pt-8 pb-6 flex flex-col items-center gap-2 text-center">
          <span className="w-[76px] h-[76px] rounded-full bg-primary text-primary-ink grid place-items-center"><Icon name="check" size={38} /></span>
          <p className="mt-2 text-[20px] font-semibold text-ink">{t('successTitle')}</p>
          <p className="text-[14px] text-dim">{t('successBody')}</p>
        </div>
        <div className="px-6 py-3.5 border-y border-border"><p className="text-[16px] font-semibold text-ink">{t('paymentDetails')}</p></div>
        <dl className="px-6 py-4 flex flex-col gap-2.5 text-[15px]">
          <div className="flex justify-between"><dt className="text-soft">{t('totalPayment')}</dt><dd className="text-ink tabular-nums">$ {formatCop(summary.total)}</dd></div>
          <div className="flex justify-between"><dt className="text-soft">{t('paymentMethod')}</dt><dd className="text-primary font-semibold">{summary.methodName}</dd></div>
          <div className="flex justify-between"><dt className="text-soft">{t('customerPays')}</dt><dd className="text-ink tabular-nums">$ {formatCop(summary.received)}</dd></div>
        </dl>
        <div className="px-6 py-3.5 bg-muted border-y border-border flex justify-between items-baseline">
          <span className="text-[16px] font-semibold text-ink">{t('change')}</span>
          <span className="text-[18px] font-bold text-ink tabular-nums">$ {formatCop(summary.change)}</span>
        </div>
        <div className="p-5 flex gap-3">
          <Button variant="secondary" className="flex-1 rounded-md" onClick={onPrint}><Icon name="printer" size={18} />{t('printBill')}</Button>
          <Button variant="primary" className="flex-1 rounded-md" onClick={onDone}><Icon name="check" size={18} />{t('paymentDone')}</Button>
        </div>
      </div>
    </div>
  )
}
