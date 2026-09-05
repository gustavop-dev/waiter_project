'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { formatCop, mine, others } from '@/lib/domain/cart'
import { pathFor } from '@/lib/domain/route'
import { useDinerStore } from '@/lib/stores/dinerStore'
import type { CartLine, Entry } from '@/lib/types'

// Pedido (sistema de diseño §06): el carrito es de la mesa. "Lo mío" se edita; lo de los demás se mira y se envía junto.
export function Cart({ rest, venue, token }: { entry: Entry; rest: string; venue: string; token: string | null; id: string | null }) {
  const t = useTranslations('diner')
  const router = useRouter()
  const { cart, busy, error, setQty, remove, confirm, refreshCart } = useDinerStore()
  const [tab, setTab] = useState<'mine' | 'table'>('mine')
  // Otros comensales también piden: al entrar se relee el carrito de la mesa (y se abre sesión si aún no había).
  useEffect(() => { void refreshCart() }, [refreshCart])

  const own = cart ? mine(cart) : []
  const theirs = cart ? others(cart) : []
  const empty = !cart || cart.lineas.length === 0
  const total = cart?.total ?? 0
  const goMenu = () => router.push(pathFor(rest, venue, token, 'carta'))
  // Bajar de 1 quita la línea: nunca queda una línea con cantidad 0 en el carrito de la mesa.
  const step = (line: CartLine, delta: number) => { const qty = line.cantidad + delta; void (qty < 1 ? remove(line.id) : setQty(line.id, qty)) }
  // Idempotente en el servidor. Si el restaurante no responde, el carrito sigue aquí y la página pinta el error.
  const onConfirm = async () => { const id = await confirm(); if (id) router.push(pathFor(rest, venue, token, 'estado', id)) }
  const menuButton = (primary: boolean) => (
    <button type="button" onClick={goMenu} className={`h-tap px-6 rounded-rest text-base font-medium ${primary ? 'bg-brand text-brand-ink' : 'bg-surface border border-border'}`}>{t('cart.goMenu')}</button>
  )
  const tabClass = (k: 'mine' | 'table') => `h-tap-min rounded-rest text-[15px] font-medium ${tab === k ? 'bg-ink text-canvas' : 'text-soft'}`

  return (
    <div className="px-[18px] pt-[22px] pb-[18px] flex flex-col gap-4">
      <Link href={pathFor(rest, venue, token, 'portada')} className="self-start inline-flex items-center h-tap-min text-[15px] font-medium text-soft">← {t('common.back')}</Link>
      <h1 className="font-display text-[32px] leading-tight">{t('cart.title')}</h1>
      {empty ? (
        <section className="py-8 flex flex-col items-center gap-4 text-center">
          <p className="text-base text-soft">{cart || error ? t('cart.empty') : t('common.loading')}</p>
          {menuButton(true)}
        </section>
      ) : (
        <>
          <div role="tablist" className="grid grid-cols-2 gap-1 p-1 rounded-rest bg-muted">
            <button type="button" role="tab" aria-selected={tab === 'mine'} onClick={() => setTab('mine')} className={tabClass('mine')}>{t('cart.mine')}</button>
            <button type="button" role="tab" aria-selected={tab === 'table'} onClick={() => setTab('table')} className={tabClass('table')}>{t('cart.table')}</button>
          </div>
          <div role="tabpanel" className="flex flex-col">
            {own.length > 0 ? (
              <ul className="flex flex-col">
                {own.map((l) => (
                  <Line key={l.id} line={l} noteLabel={t('cart.note')}>
                    <div className="flex items-center justify-between">
                      <div role="group" aria-label={l.nombre} className="inline-flex items-center rounded-rest border border-border bg-surface overflow-hidden">
                        <button type="button" aria-label={t('dish.fewer')} disabled={busy} onClick={() => step(l, -1)} className="w-tap-min h-tap-min text-xl leading-none disabled:opacity-50">−</button>
                        <span className="min-w-9 text-center font-mono tabular text-[15px]">{l.cantidad}</span>
                        <button type="button" aria-label={t('dish.more')} disabled={busy} onClick={() => step(l, 1)} className="w-tap-min h-tap-min text-xl leading-none disabled:opacity-50">＋</button>
                      </div>
                      <button type="button" disabled={busy} onClick={() => void remove(l.id)} className="h-tap-min px-2 text-[15px] font-medium text-busy-ink disabled:opacity-50">{t('cart.remove')}</button>
                    </div>
                  </Line>
                ))}
              </ul>
            ) : tab === 'mine' && (
              <div className="py-6 flex flex-col items-center gap-3 text-center">
                <p className="text-soft">{t('cart.empty')}</p>
                {menuButton(false)}
              </div>
            )}
            {tab === 'table' && theirs.length > 0 && (
              <section className="flex flex-col">
                <h2 className="pt-4 pb-1 text-[12px] tracking-[0.08em] uppercase text-ink-3">{t('cart.others')}</h2>
                <ul className="flex flex-col">{theirs.map((l) => <Line key={l.id} line={l} noteLabel={t('cart.note')} />)}</ul>
              </section>
            )}
          </div>
          <dl className="pt-2 flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between"><dt className="text-[15px] text-soft">{t('cart.subtotalMine')}</dt><dd className="font-mono tabular text-[15px]">$ {formatCop(cart.mio)}</dd></div>
            <div className="flex items-baseline justify-between"><dt className="text-lg font-medium">{t('cart.subtotalTable')}</dt><dd className="font-mono tabular text-[24px]">$ {formatCop(total)}</dd></div>
          </dl>
          <button type="button" disabled={busy} onClick={() => void onConfirm()} className="h-tap-money rounded-rest bg-brand text-brand-ink text-[17px] font-medium disabled:opacity-60">
            {busy ? t('cart.confirming') : t('cart.confirm', { amount: formatCop(total) })}
          </button>
          {error && <p role="status" className="text-center text-[13px] text-busy-ink">{t('common.offline')}</p>}
        </>
      )}
    </div>
  )
}

// Una línea del carrito: nombre, nota, precio unitario × cantidad y subtotal en mono. Los controles (si es mía) van debajo.
function Line({ line, noteLabel, children }: { line: CartLine; noteLabel: string; children?: React.ReactNode }) {
  return (
    <li className="py-3 border-b border-border flex flex-col gap-2">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col min-w-0">
          <span className="text-[15px] font-medium leading-snug">{line.nombre}</span>
          {line.nota && <span className="text-[13px] text-soft leading-snug">{noteLabel}: {line.nota}</span>}
          <span className="font-mono tabular text-[13px] text-soft">{formatCop(line.precio)} × {line.cantidad}</span>
        </div>
        <span className="font-mono tabular text-[15px] shrink-0">{formatCop(line.subtotal)}</span>
      </div>
      {children}
    </li>
  )
}
