'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { formatCop } from '@/lib/domain/cart'
import { pathFor } from '@/lib/domain/route'
import { useDinerStore } from '@/lib/stores/dinerStore'
import type { Bill as BillSummary, Entry } from '@/lib/types'

type Mode = 'all' | 'mine' | 'split'
const MODES: Mode[] = ['all', 'mine', 'split']
const MAX_PARTS = 8
const clampParts = (n: number) => Math.min(MAX_PARTS, Math.max(1, n))

// La cuenta (Plan F, tarea 5): todo / lo mío / dividir sobre lo confirmado. Abrirla avisa al salón por Odoo (waiter_call = bill).
export function Bill({ rest, venue, token }: { entry: Entry; rest: string; venue: string; token: string | null; id: string | null }) {
  const t = useTranslations('diner.bill')
  const tc = useTranslations('diner.common')
  const td = useTranslations('diner.dish')
  const router = useRouter()
  const { order, askBill } = useDinerStore()
  const [bill, setBill] = useState<BillSummary | null>(null)
  const [mode, setMode] = useState<Mode>('all')
  const [parts, setParts] = useState(1)

  // Se pide al montar y se muestra solo la respuesta fresca: nunca la cuenta de una visita anterior.
  useEffect(() => {
    let alive = true
    void askBill().then((fresh) => { if (alive && fresh) { setBill(fresh); setParts(clampParts(fresh.partes)) } })
    return () => { alive = false }
  }, [askBill])

  const back = () => router.push(order ? pathFor(rest, venue, token, 'estado', order.id) : pathFor(rest, venue, token, 'pedido'))
  const backLink = <button type="button" onClick={back} className="h-tap-min rounded-r text-[15px] font-medium text-brand">{t('back')}</button>

  if (!bill) return <div className="p-[18px] flex flex-col gap-3"><p className="text-soft">{tc('loading')}</p>{backLink}</div>
  if (bill.total === 0) return <div className="px-[18px] pt-[22px] flex flex-col gap-3"><p className="text-base text-soft">{t('nothing')}</p>{backLink}</div>

  const perPart = Math.ceil(bill.total / parts)
  const amount = mode === 'all' ? bill.total : mode === 'mine' ? bill.mio : perPart
  const stepper = 'w-tap-min h-tap-min rounded-full border border-border bg-surface text-xl leading-none disabled:opacity-40'
  return (
    <div className="px-[18px] pt-[22px] pb-[18px] flex flex-col gap-4">
      <h1 className="font-display text-[32px] leading-tight">{t('title')}</h1>
      <div role="tablist" aria-label={t('title')} className="grid grid-cols-3 gap-1 p-1 rounded-r bg-muted">
        {MODES.map((m) => (
          <button key={m} type="button" role="tab" aria-selected={mode === m} onClick={() => setMode(m)} className={`h-tap-min rounded-r text-[15px] font-medium ${mode === m ? 'bg-brand-soft text-ink' : 'text-soft'}`}>{t(m)}</button>
        ))}
      </div>
      <section role="tabpanel" className="rounded-r bg-surface border border-border p-[18px] flex flex-col gap-3">
        <span className="text-[13px] tracking-[0.08em] uppercase text-ink-3">{t(mode)}</span>
        <span className="font-mono tabular text-[34px] leading-none">$ {formatCop(amount)}</span>
        {mode === 'split' && (
          <div className="flex items-center justify-between gap-3 pt-1">
            <span className="text-[15px] text-soft">{t('parts', { n: parts, amount: formatCop(perPart) })}</span>
            <div className="flex items-center gap-2">
              <button type="button" aria-label={td('fewer')} disabled={parts <= 1} onClick={() => setParts((p) => clampParts(p - 1))} className={stepper}>−</button>
              <span className="font-mono tabular text-lg min-w-[2ch] text-center">{parts}</span>
              <button type="button" aria-label={td('more')} disabled={parts >= MAX_PARTS} onClick={() => setParts((p) => clampParts(p + 1))} className={stepper}>＋</button>
            </div>
          </div>
        )}
      </section>
      {bill.ok && <p role="status" className="px-3.5 py-2.5 rounded-r bg-free-soft text-free-ink text-[15px]">{t('requested')}</p>}
      {/* Placeholder de la pasarela (decisión pendiente): la acción principal existe pero aún no cobra. */}
      <button type="button" disabled className="h-tap rounded-r bg-brand text-brand-ink text-base font-medium disabled:opacity-50">{`${t('payPhone')} · ${t('soon')}`}</button>
      {backLink}
    </div>
  )
}
