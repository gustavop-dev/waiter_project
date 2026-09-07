'use client'

import { useTranslations } from 'next-intl'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { Icon } from '@/components/kit/Icon'
import { Toggle } from '@/components/kit/Toggle'
import { CardPanel, CashPanel, QrPanel } from '@/components/payment/PaymentPanels'
import { PaymentSuccess, type PaidSummary } from '@/components/payment/PaymentSuccess'
import { Button } from '@/components/ui/Button'
import { formatCop } from '@/lib/domain/money'
import { change as changeOf, remaining, splitEqual, suggestedTip, type Payment } from '@/lib/domain/payment'
import { amountOf, CARD_TIMEOUT_MS, methodFor, PAY_KINDS, pointsDiscount, pointsToRedeem, QR_CHECK_MS, type PayKind } from '@/lib/domain/paymentKit'
import { manualTerminal, type TerminalResult } from '@/lib/payments/terminal'
import { loadLoyaltyProgram, lookupMember, readPayableOrder, redeemPoints, type LoyaltyProgram, type Member, type PayableOrder } from '@/lib/services/paymentKit'
import { useCatalogStore } from '@/lib/stores/catalogStore'
import { useOrderStore } from '@/lib/stores/orderStore'
import { cn } from '@/lib/utils'

const KIND_ICON = { cash: 'money', card: 'card', qr: 'qr' } as const
type TipMode = 'none' | 'suggested' | 'custom'

// Modal "Payment" del kit (9 – Payment): cliente y puntos a la izquierda, métodos a la derecha; el cobro real
// va a Odoo por orderStore.settle (add_payment + action_pos_order_paid).
export function PaymentModal({ orderId, onClose, onPaid }: { orderId: number; onClose: () => void; onPaid: (s: PaidSummary) => void }) {
  const t = useTranslations('payment')
  const catalog = useCatalogStore((s) => s.catalog)
  const { settle, busy, error } = useOrderStore()

  const [order, setOrder] = useState<PayableOrder | null>(null)
  const [program, setProgram] = useState<LoyaltyProgram | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [code, setCode] = useState('')
  const [member, setMember] = useState<Member | null>(null)
  const [memberMissing, setMemberMissing] = useState(false)
  const [usePoints, setUsePoints] = useState(false)
  const [kind, setKind] = useState<PayKind>('cash')
  const [tipMode, setTipMode] = useState<TipMode>('none')
  const [customTip, setCustomTip] = useState(0)
  const [parts, setParts] = useState(1)
  const [options, setOptions] = useState(false)
  const [payments, setPayments] = useState<Payment[]>([])
  const [cashText, setCashText] = useState('')
  const [cardStage, setCardStage] = useState<'idle' | 'terminal'>('idle')
  const [checking, setChecking] = useState(false)
  const [done, setDone] = useState<PaidSummary | null>(null)
  const [deadline] = useState(() => Date.now() + CARD_TIMEOUT_MS)
  const askRef = useRef<((r: TerminalResult) => void) | null>(null)

  useEffect(() => {
    let alive = true
    void (async () => {
      try {
        const [o, p] = await Promise.all([readPayableOrder(orderId), loadLoyaltyProgram().catch(() => null)])
        if (alive) { setOrder(o); setProgram(p) }
      } catch { if (alive) setLoadFailed(true) }
    })()
    return () => { alive = false }
  }, [orderId])

  const methods = useMemo(() => catalog?.paymentMethods ?? [], [catalog])
  const method = methodFor(kind, methods)
  const base = order?.total ?? 0
  const tip = tipMode === 'none' ? 0 : tipMode === 'suggested' ? suggestedTip(base) : customTip
  const rate = useMemo(() => ({ copPerPoint: program?.copPerPoint ?? 0 }), [program])
  const discount = usePoints && member ? pointsDiscount(member.points, rate, base + tip) : 0
  const grand = Math.max(0, base + tip - discount)
  const left = remaining(grand, payments)
  const due = Math.min(left, splitEqual(grand, parts)[Math.min(payments.length, parts - 1)] ?? left)

  const finish = useCallback(async (all: Payment[]) => {
    if (!order || !catalog) return
    if (discount > 0 && member && program) {
      await redeemPoints(order.id, member, program, pointsToRedeem(discount, rate), discount, order.total)
    }
    const ok = await settle({ tip, payments: all }, {
      existing: { orderId: order.id, tableId: order.tableId ?? 0 }, tipProductId: catalog.settings.tipProductId,
      tableNumber: order.tableId ?? 0, company: catalog.company.name,
      lines: order.lines.map((l) => ({ uuid: l.uuid, name: l.name, qty: l.qty, unitPrice: l.unitPrice, total: l.total })),
      methodName: (id) => methods.find((m) => m.id === id)?.name ?? '',
    })
    if (ok) {
      const first = all[0]
      setDone({ total: grand, methodName: methods.find((m) => m.id === first?.methodId)?.name ?? '', received: all.reduce((a, p) => a + p.received, 0), change: changeOf(all) })
    }
  }, [order, catalog, discount, member, program, rate, settle, tip, methods, grand])

  const register = useCallback((p: Payment) => {
    const all = [...payments, p]
    setPayments(all)
    setCashText('')
    setCardStage('idle')
    if (remaining(grand, all) === 0) void finish(all)
  }, [payments, grand, finish])

  // Datáfono: el adaptador manual espera a que el cajero apruebe o rechace en pantalla (lib/payments/terminal.ts).
  async function payCard() {
    if (!method) return
    const terminal = manualTerminal(() => new Promise<TerminalResult>((resolve) => { askRef.current = resolve; setCardStage('terminal') }))
    const result = await terminal.charge(due)
    askRef.current = null
    if (result.approved) register({ methodId: method.id, type: method.type, amount: due, received: due, reference: result.reference })
    else setCardStage('idle')
  }

  function payQr() {
    if (!method) return
    setChecking(true)
    setTimeout(() => { setChecking(false); register({ methodId: method.id, type: method.type, amount: due, received: due, reference: '' }) }, QR_CHECK_MS)
  }

  async function search() {
    if (!program || code.trim() === '') return
    const found = await lookupMember(code, program.id)
    setMember(found)
    setMemberMissing(found === null)
    setUsePoints(found !== null)
  }

  if (done) return <PaymentSuccess summary={done} onPrint={() => window.print()} onDone={() => onPaid(done)} />

  const badge = order?.tableId ? t('tableBadge', { n: order.tableNumber.replace(/\D/g, '') || order.tableNumber }) : t('takeAwayBadge')
  const presetLabel = order?.presetId ? t(`types.${order.presetId}` as 'types.1') : order?.presetName ?? ''

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-overlay/60 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={t('title')} onClick={(e) => e.stopPropagation()}
        className="w-[798px] max-w-full h-[700px] max-h-[94vh] bg-surface rounded-xl shadow-xl flex flex-col overflow-hidden">
        <header className="h-[68px] px-6 flex items-center justify-between border-b border-border shrink-0">
          <h2 className="text-[20px] font-semibold text-ink">{t('title')}</h2>
          <button type="button" onClick={onClose} aria-label={t('close')} className="w-10 h-10 rounded-md bg-ink text-surface grid place-items-center"><Icon name="close" size={20} /></button>
        </header>

        {!order ? (
          <p className="flex-1 grid place-items-center text-[15px] text-soft">{loadFailed ? t('notFound') : t('loading')}</p>
        ) : (
          <div className="flex-1 min-h-0 flex">
            {/* Izquierda: cliente, socio y detalle del pedido */}
            <div className="w-[396px] shrink-0 border-r border-border flex flex-col min-h-0">
              <div className="px-5 pt-4 pb-3 flex flex-col gap-3 border-b border-dashed border-border">
                <span className="text-[14px] text-soft">{t('customerInformation')}</span>
                <div className="flex items-start gap-3">
                  <span className="w-10 h-10 rounded-md bg-primary text-primary-ink grid place-items-center text-[14px] font-semibold shrink-0">{badge}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-ink truncate">{order.customerName || t('noName')}</p>
                    <p className="text-[13px] text-soft truncate">{t('orderNo')} <span className="font-semibold text-ink">{order.trackingNumber}</span> / {presetLabel}</p>
                  </div>
                  <span className="text-[13px] text-soft shrink-0">{order.date.slice(0, 16)}</span>
                </div>
                <div className="flex gap-2">
                  <input value={code} onChange={(e) => setCode(e.target.value)} disabled={!program} placeholder={program ? t('searchPlaceholder') : t('noProgram')}
                    aria-label={t('memberCode')} className="flex-1 min-w-0 h-12 px-3.5 rounded-md border border-border bg-surface text-[15px] text-ink placeholder:text-dim focus:outline-2 focus:outline-primary disabled:opacity-60" />
                  <Button variant="primary" className="rounded-md" disabled={!program} onClick={() => void search()}>{t('search')}</Button>
                </div>
                {memberMissing && <p role="alert" className="text-[13px] text-danger-ink">{t('memberNotFound')}</p>}
                {member && (
                  <div className="p-3.5 rounded-md bg-canvas border border-border flex flex-col gap-1.5">
                    <div className="flex justify-between text-[13px] text-soft"><span>{t('memberCodeLabel')} <span className="font-semibold text-ink">{member.code}</span></span></div>
                    <div className="flex justify-between items-baseline">
                      <span className="text-[15px] font-semibold text-ink">{member.name}</span>
                      <span className="text-[14px] text-soft">{t('points')} <span className="font-semibold text-ink tabular-nums">{formatCop(member.points)}</span></span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[15px] text-ink">{t('usePoints')}</span>
                      <span className="flex items-center gap-2">
                        <span className="text-[13px] text-dim">{t('pointsRate', { amount: `$ ${formatCop(rate.copPerPoint * 100)}` })}</span>
                        <Toggle checked={usePoints} onChange={setUsePoints} label={t('usePoints')} />
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <p className="px-5 py-3 text-[16px] font-semibold text-ink border-b border-border">{t('orderDetails')}</p>
              <ul className="flex-1 min-h-0 overflow-auto px-5 py-3 flex flex-col gap-3">
                {order.lines.map((l) => (
                  <li key={l.uuid} className="flex justify-between gap-3">
                    <span className="min-w-0">
                      <span className="block text-[15px] text-ink truncate">{l.name}</span>
                      <span className="block text-[13px] text-soft tabular-nums">$ {formatCop(l.unitPrice)}</span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className="block text-[13px] text-soft">x {l.qty}</span>
                      <span className="block text-[15px] font-semibold text-ink tabular-nums">$ {formatCop(l.total)}</span>
                    </span>
                  </li>
                ))}
              </ul>

              <dl className="shrink-0 px-5 py-4 bg-canvas border-t border-border flex flex-col gap-2 text-[15px]">
                <div className="flex justify-between"><dt className="text-soft">{t('subtotal')}</dt><dd className="text-ink tabular-nums">$ {formatCop(base - order.tax)}</dd></div>
                <div className="flex justify-between"><dt className="text-soft">{t('tax')}</dt><dd className="text-ink tabular-nums">$ {formatCop(order.tax)}</dd></div>
                {tip > 0 && <div className="flex justify-between"><dt className="text-soft">{t('tip')}</dt><dd className="text-ink tabular-nums">$ {formatCop(tip)}</dd></div>}
                {discount > 0 && <div className="flex justify-between"><dt className="text-success-ink">{t('memberPoints')}</dt><dd className="text-success-ink tabular-nums">− $ {formatCop(discount)}</dd></div>}
                <div className="flex justify-between"><dt className="font-semibold text-ink">{t('totalPayment')}</dt><dd className="text-[17px] font-bold text-ink tabular-nums">$ {formatCop(grand)}</dd></div>
              </dl>
            </div>

            {/* Derecha: métodos de pago */}
            <div className="flex-1 min-w-0 flex flex-col min-h-0">
              <div role="tablist" aria-label={t('method')} className="m-5 mb-0 p-1 rounded-lg bg-muted flex shrink-0">
                {PAY_KINDS.map((k) => (
                  <button key={k} type="button" role="tab" aria-selected={kind === k} onClick={() => { setKind(k); setCardStage('idle') }}
                    className={cn('flex-1 h-11 rounded-md flex items-center justify-center gap-2 text-[15px] font-semibold', kind === k ? 'bg-surface border border-border text-ink' : 'text-dim')}>
                    <Icon name={KIND_ICON[k]} size={18} />{t(`methods.${k}`)}
                  </button>
                ))}
              </div>

              <div className="flex-1 min-h-0 overflow-auto flex flex-col">
                {kind === 'cash' && <CashPanel due={due} text={cashText} onText={setCashText} busy={busy}
                  onPay={(received) => method && register({ methodId: method.id, type: 'cash', amount: due, received, reference: '' })} />}
                {kind === 'card' && <CardPanel due={due} deadline={deadline} stage={cardStage} busy={busy}
                  onConfirm={() => void payCard()} onResult={(approved, reference) => askRef.current?.({ approved, reference })} />}
                {kind === 'qr' && <QrPanel due={due} deadline={deadline} company={catalog?.company.name ?? ''} checking={checking} busy={busy}
                  payload={`WAITER|${order.trackingNumber}|${Math.round(due)}`} onConfirm={payQr} />}

                {!method && <p role="alert" className="px-6 text-[14px] text-danger-ink">{t('noQrMethod')}</p>}
                {error && <p role="alert" className="px-6 pb-2 text-[14px] text-danger-ink">{error}</p>}

                <div className="px-6 pb-5">
                  <button type="button" aria-expanded={options} onClick={() => setOptions((v) => !v)} className="h-10 flex items-center gap-1.5 text-[14px] font-semibold text-soft">
                    <Icon name={options ? 'chevronDown' : 'chevronRight'} size={16} />{t('moreOptions')}
                  </button>
                  {options && (
                    <div className="flex flex-col gap-4 p-4 rounded-lg border border-border bg-canvas">
                      <div className="flex flex-col gap-2">
                        <span className="text-[14px] text-soft">{t('tip')}</span>
                        <div className="flex gap-2 flex-wrap">
                          {(['none', 'suggested', 'custom'] as TipMode[]).map((m) => (
                            <button key={m} type="button" aria-pressed={tipMode === m} onClick={() => setTipMode(m)}
                              className={cn('h-10 px-3.5 rounded-md border text-[14px] font-semibold', tipMode === m ? 'bg-primary-soft border-primary/40 text-primary' : 'bg-surface border-border text-soft')}>
                              {m === 'none' ? t('tipNone') : m === 'suggested' ? t('tipSuggested', { amount: `$ ${formatCop(suggestedTip(base))}` }) : t('tipCustom')}
                            </button>
                          ))}
                        </div>
                        {tipMode === 'custom' && (
                          <input type="number" min={0} value={customTip} aria-label={t('tipAmount')} onChange={(e) => setCustomTip(Math.max(0, amountOf(e.target.value)))}
                            className="h-11 px-3.5 rounded-md border border-border bg-surface text-[15px] text-ink tabular-nums" />
                        )}
                      </div>
                      <div className="flex flex-col gap-2">
                        <span className="text-[14px] text-soft">{t('split')}</span>
                        <div className="flex items-center gap-3">
                          <button type="button" aria-label={t('fewerParts')} onClick={() => setParts((p) => Math.max(1, p - 1))} className="w-10 h-10 rounded-sm bg-muted text-ink grid place-items-center"><Icon name="minus" size={18} /></button>
                          <span className="min-w-8 text-center text-[16px] font-semibold text-ink tabular-nums">{parts}</span>
                          <button type="button" aria-label={t('moreParts')} onClick={() => setParts((p) => Math.min(8, p + 1))} className="w-10 h-10 rounded-sm border border-border bg-surface text-ink grid place-items-center"><Icon name="plus" size={18} /></button>
                          <span className="text-[14px] text-soft">{parts > 1 ? t('partsOf', { n: parts, amount: `$ ${formatCop(splitEqual(grand, parts)[0])}` }) : t('noSplit')}</span>
                        </div>
                      </div>
                      {payments.length > 0 && (
                        <ul className="flex flex-col gap-2">
                          {payments.map((p, i) => (
                            <li key={i} className="h-11 px-3.5 rounded-md bg-surface border border-border flex items-center justify-between text-[14px]">
                              <span className="text-ink">{methods.find((m) => m.id === p.methodId)?.name}</span>
                              <span className="flex items-center gap-3">
                                <span className="text-ink tabular-nums">$ {formatCop(p.amount)}</span>
                                <button type="button" aria-label={t('removePayment')} onClick={() => setPayments((ps) => ps.filter((_, j) => j !== i))} className="text-soft"><Icon name="close" size={16} /></button>
                              </span>
                            </li>
                          ))}
                          <li className="flex justify-between text-[14px]"><span className="text-soft">{t('remaining')}</span><span className="font-semibold text-ink tabular-nums">$ {formatCop(left)}</span></li>
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
