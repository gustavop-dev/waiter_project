'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/Field'
import { formatCop } from '@/lib/domain/money'

// Datáfono manual: el cajero digita el monto en el datáfono y confirma aquí la aprobación (con voucher opcional).
export function TerminalDialog({ amount, onResult }: { amount: number; onResult: (approved: boolean, reference: string) => void }) {
  const t = useTranslations('pos.pay.terminal')
  const [reference, setReference] = useState('')
  return (
    <div role="dialog" aria-modal="true" aria-label={t('title')} className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-6">
      <div className="w-[440px] rounded-[18px] bg-surface p-6 flex flex-col gap-4 shadow-xl">
        <span className="text-[13px] tracking-[0.1em] uppercase text-ink-3 font-medium">{t('title')}</span>
        <p className="text-[17px] leading-snug">{t('body', { amount: `$ ${formatCop(amount)}` })}</p>
        <span className="font-mono tabular text-[34px]">$ {formatCop(amount)}</span>
        <TextInput label={t('reference')} value={reference} onChange={(e) => setReference(e.target.value)} className="font-mono" />
        <div className="flex gap-2.5">
          <Button variant="primary" className="flex-1" onClick={() => onResult(true, reference.trim())}>{t('approved')}</Button>
          <Button variant="destructive" onClick={() => onResult(false, '')}>{t('declined')}</Button>
        </div>
      </div>
    </div>
  )
}
