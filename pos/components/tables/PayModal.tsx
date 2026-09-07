'use client'

import { useTranslations } from 'next-intl'

import { Modal } from '@/components/kit/Modal'
import { PayPanel } from '@/components/pay/PayPanel'
import { Receipt } from '@/components/pay/Receipt'
import type { BillLine } from '@/components/salon/BillPanel'
import type { SettlePlan } from '@/lib/domain/payment'
import type { ReceiptData } from '@/lib/stores/orderStore'
import type { PaymentMethod } from '@/lib/types'

interface Props {
  open: boolean; onClose: () => void; tableNumber: number; total: number; lines: BillLine[]; methods: PaymentMethod[]; busy: boolean
  onSettle: (plan: SettlePlan) => void; receipt: ReceiptData | null; onCloseReceipt: () => void
}

// Provisional: el cobro actual (PayPanel + recibo) dentro de un modal del kit, hasta que exista la pantalla de pago del kit (/pago/<orderId>).
export function PayModal({ open, onClose, tableNumber, total, lines, methods, busy, onSettle, receipt, onCloseReceipt }: Props) {
  const t = useTranslations('tables.pay')
  return (
    <Modal open={open} onClose={receipt ? onCloseReceipt : onClose} title={t('title', { name: String(tableNumber) })} size="wide">
      <div className="h-full flex justify-center bg-canvas">
        {receipt ? <Receipt data={receipt} onClose={onCloseReceipt} /> : <PayPanel key={tableNumber} tableNumber={tableNumber} total={total} lines={lines} methods={methods} busy={busy} onSettle={onSettle} onCancel={onClose} />}
      </div>
    </Modal>
  )
}
