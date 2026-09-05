'use client'

import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { TerminalDialog } from '@/components/pay/TerminalDialog'
import type { BillLine } from '@/components/salon/BillPanel'
import { Button } from '@/components/ui/Button'
import { TextInput } from '@/components/ui/Field'
import { formatCop } from '@/lib/domain/money'
import { canSettle, change, remaining, splitEqual, suggestedTip, type Payment, type SettlePlan } from '@/lib/domain/payment'
import type { PaymentMethod } from '@/lib/types'
import { cn } from '@/lib/utils'

type TipMode = 'none' | 'suggested' | 'custom'
interface PayPanelProps { tableNumber: number; total: number; lines: BillLine[]; methods: PaymentMethod[]; busy: boolean; onSettle: (plan: SettlePlan) => void; onCancel: () => void }

export function PayPanel({ tableNumber, total, methods, busy, onSettle, onCancel }: PayPanelProps) {
  const t = useTranslations('pos.pay')
  const usable = methods.filter((m) => m.type !== 'pay_later')
  const [tipMode, setTipMode] = useState<TipMode>('none')
  const [customTip, setCustomTip] = useState(0)
  const [parts, setParts] = useState(1)
  const [payments, setPayments] = useState<Payment[]>([])
  const [methodId, setMethodId] = useState(usable.find((m) => m.type === 'cash')?.id ?? usable[0]?.id ?? 0)
  const [amountText, setAmountText] = useState<string | null>(null)
  const [receivedText, setReceivedText] = useState<string | null>(null)
  const [terminalAmount, setTerminalAmount] = useState<number | null>(null)

  const tip = tipMode === 'none' ? 0 : tipMode === 'suggested' ? suggestedTip(total) : customTip
  const grand = total + tip
  const left = remaining(grand, payments)
  const part = splitEqual(grand, parts)[Math.min(payments.length, parts - 1)] ?? left
  const method = usable.find((m) => m.id === methodId)
  const amount = amountText === null ? Math.min(left, part) : Number(amountText)
  const received = receivedText === null ? amount : Number(receivedText)
  const ch = change(payments)

  function push(p: Payment) {
    setPayments((ps) => [...ps, p])
    setAmountText(null)
    setReceivedText(null)
  }
  function add() {
    if (!method || amount <= 0) return
    if (method.type === 'cash') push({ methodId: method.id, type: 'cash', amount, received: Math.max(received, amount), reference: '' })
    else setTerminalAmount(amount)
  }
  return (
    <aside aria-label={t('title', { number: tableNumber })} className="w-panel-lg shrink-0 border-l border-border bg-surface flex flex-col">
      <header className="px-[22px] py-4 border-b border-[#EFE9E0] flex items-start justify-between">
        <div className="flex flex-col"><span className="text-[19px] font-bold">{t('title', { number: tableNumber })}</span><span className="text-sm text-soft">{t('subtotalLabel')} <span className="font-mono tabular">{formatCop(total)}</span></span></div>
        <span className="font-mono tabular text-[28px]">$ {formatCop(grand)}</span>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto px-[22px] py-4 flex flex-col gap-5">
        <section className="flex flex-col gap-2">
          <span className="text-[13px] tracking-[0.08em] uppercase text-ink-3 font-medium">{t('tip')}</span>
          <div className="flex gap-2">
            {(['none', 'suggested', 'custom'] as TipMode[]).map((m) => (
              <button key={m} type="button" aria-pressed={tipMode === m} onClick={() => setTipMode(m)} className={cn('h-tap-min px-4 rounded-full border text-[15px]', tipMode === m ? 'bg-ink text-canvas border-ink font-bold' : 'bg-surface border-border')}>
                {m === 'none' ? t('tipNone') : m === 'suggested' ? t('tipSuggested', { amount: formatCop(suggestedTip(total)) }) : t('tipCustom')}
              </button>
            ))}
          </div>
          {tipMode === 'custom' && <TextInput label={t('tipAmount')} type="number" min={0} value={customTip} onChange={(e) => setCustomTip(Math.max(0, Number(e.target.value)))} className="font-mono" />}
        </section>
        <section className="flex flex-col gap-2">
          <span className="text-[13px] tracking-[0.08em] uppercase text-ink-3 font-medium">{t('split')}</span>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center border border-border rounded-[10px] overflow-hidden">
              <button type="button" aria-label={t('fewerParts')} className="w-tap-min h-tap-min text-xl" onClick={() => setParts((p) => Math.max(1, p - 1))}>−</button>
              <span className="w-10 text-center font-mono tabular text-lg">{parts}</span>
              <button type="button" aria-label={t('moreParts')} className="w-tap-min h-tap-min text-xl" onClick={() => setParts((p) => Math.min(8, p + 1))}>＋</button>
            </div>
            <span className="text-[15px] text-soft">{parts > 1 ? t('partsOf', { n: parts, amount: formatCop(splitEqual(grand, parts)[0]) }) : t('noSplit')}</span>
          </div>
        </section>
        <section className="flex flex-col gap-2">
          <span className="text-[13px] tracking-[0.08em] uppercase text-ink-3 font-medium">{t('payments')}</span>
          {payments.map((p, i) => (
            <div key={i} className="flex items-center justify-between h-tap-min px-3.5 rounded-[10px] bg-canvas border border-[#EFE9E0] text-[15px]">
              <span>{usable.find((m) => m.id === p.methodId)?.name}{p.reference && <span className="text-soft font-mono"> · {p.reference}</span>}{p.type === 'cash' && p.received > p.amount && <span className="text-soft"> · {t('received')} {formatCop(p.received)}</span>}</span>
              <span className="flex items-center gap-3"><span className="font-mono tabular">{formatCop(p.amount)}</span><button type="button" aria-label={t('removePayment')} onClick={() => setPayments((ps) => ps.filter((_, j) => j !== i))} className="text-soft">✕</button></span>
            </div>
          ))}
          {left > 0 && (
            <div className="flex flex-col gap-2.5 p-3.5 rounded-[14px] border border-border">
              <div className="flex gap-2" role="radiogroup" aria-label={t('method')}>
                {usable.map((m) => <button key={m.id} type="button" role="radio" aria-checked={methodId === m.id} onClick={() => setMethodId(m.id)} className={cn('flex-1 h-tap-min rounded-[10px] border text-[15px]', methodId === m.id ? 'bg-brand-500 text-white border-brand-500 font-bold' : 'bg-surface border-border')}>{m.type === 'bank' ? t('card') : m.name}</button>)}
              </div>
              <TextInput label={t('amount')} type="number" min={1} max={left} value={amount} onChange={(e) => setAmountText(e.target.value)} className="font-mono text-lg" />
              {method?.type === 'cash' && <TextInput label={t('receivedLabel')} type="number" min={0} value={received} onChange={(e) => setReceivedText(e.target.value)} className="font-mono text-lg" hint={received > amount ? t('changeHint', { amount: formatCop(received - amount) }) : undefined} />}
              <Button onClick={add} disabled={amount <= 0 || amount > left || (method?.type === 'cash' && received < amount)}>{t('addPayment')}</Button>
            </div>
          )}
        </section>
      </div>
      <footer className="px-[22px] py-4 border-t border-[#EFE9E0] bg-canvas flex flex-col gap-2.5">
        <div className="flex justify-between text-[15px]"><span className="text-soft">{t('remaining')}</span><span className={cn('font-mono tabular', left > 0 ? 'text-busy-ink' : 'text-free-ink')}>{formatCop(left)}</span></div>
        {ch > 0 && <div className="flex justify-between text-[15px]"><span className="text-soft">{t('change')}</span><span className="font-mono tabular">{formatCop(ch)}</span></div>}
        <Button variant="primary" size="money" className="w-full" disabled={busy || !canSettle(grand, payments)} onClick={() => onSettle({ tip, payments })}>{t('confirm')}</Button>
        <Button onClick={onCancel} disabled={busy}>{t('cancel')}</Button>
      </footer>
      {terminalAmount !== null && method && (
        <TerminalDialog amount={terminalAmount} onResult={(approved, reference) => { if (approved) push({ methodId: method.id, type: method.type, amount: terminalAmount, received: terminalAmount, reference }); setTerminalAmount(null) }} />
      )}
    </aside>
  )
}
