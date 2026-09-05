'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useRef, useState } from 'react'

import { formatCop, mine, others } from '@/lib/domain/cart'
import { pathFor } from '@/lib/domain/route'
import { useDinerStore } from '@/lib/stores/dinerStore'
import type { CartLine, Entry } from '@/lib/types'

const TABS = ['mine', 'table'] as const
type Tab = (typeof TABS)[number]
const TAB_LABEL = { mine: 'cart.mine', table: 'cart.table' } as const

// Pedido (sistema de diseño §06): el carrito es de la mesa. "Lo mío" se edita; lo de los demás se mira y se envía junto.
export function Cart({ rest, venue, token }: { entry: Entry; rest: string; venue: string; token: string | null; id: string | null }) {
  const t = useTranslations('diner')
  const router = useRouter()
  const { cart, busy, error, setQty, remove, confirm, refreshCart, ensureSession } = useDinerStore()
  const [tab, setTab] = useState<Tab>('mine')
  // "Enviando…" solo mientras se envía de verdad: `busy` es global (cambiar cantidades o releer también lo encienden).
  const [sending, setSending] = useState(false)
  const tabRefs = useRef<Record<Tab, HTMLButtonElement | null>>({ mine: null, table: null })
  // Solo se asegura la sesión: la página relee el carrito al entrar a la pantalla y al abrirse la sesión (un único GET).
  useEffect(() => { void ensureSession() }, [ensureSession])

  const menuPath = pathFor(rest, venue, token, 'carta')
  const goMenu = () => router.push(menuPath)
  // Bajar de 1 quita la línea: nunca queda una línea con cantidad 0 en el carrito de la mesa.
  const step = (line: CartLine, delta: number) => { const qty = line.cantidad + delta; void (qty < 1 ? remove(line.id) : setQty(line.id, qty)) }
  // Idempotente en el servidor. Si falla, el store guarda el detalle y la página lo pinta: aquí no se repite ni se contradice.
  const onConfirm = async () => {
    setSending(true)
    try { const id = await confirm(); if (id) router.push(pathFor(rest, venue, token, 'estado', id)) } finally { setSending(false) }
  }
  // Dos pestañas (WAI-ARIA tabs): las flechas alternan y mueven el foco; solo la activa entra en el orden de tabulación.
  const onTabKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    e.preventDefault()
    const next: Tab = tab === 'mine' ? 'table' : 'mine'
    setTab(next)
    tabRefs.current[next]?.focus()
  }
  const primary = 'h-tap px-6 rounded-rest bg-brand text-brand-ink text-base font-medium'
  const tabClass = (k: Tab) => `h-tap-min rounded-rest text-[15px] font-medium ${tab === k ? 'bg-brand-soft text-ink' : 'text-soft'}`
  const shell = 'px-[18px] pt-[22px] pb-[18px] flex flex-col gap-4'
  const head = (
    <>
      <Link href={pathFor(rest, venue, token, 'portada')} className="self-start inline-flex items-center h-tap-min text-[15px] font-medium text-soft">← {t('common.back')}</Link>
      <h1 className="font-display text-[32px] leading-tight">{t('cart.title')}</h1>
    </>
  )

  // Tres estados distintos (§07 "di qué pasa y qué hacer"): cargando, no se pudo leer (reintentar) y vacío de verdad (ver la carta).
  if (!cart) {
    return (
      <div className={shell}>
        {head}
        <section className="py-8 flex flex-col items-center gap-4 text-center">
          <p className="text-base text-soft">{error ? t('cart.loadFailed') : t('common.loading')}</p>
          {error && <button type="button" onClick={() => void refreshCart()} className={primary}>{t('common.retry')}</button>}
        </section>
      </div>
    )
  }
  if (cart.lineas.length === 0) {
    return (
      <div className={shell}>
        {head}
        <section className="py-8 flex flex-col items-center gap-4 text-center">
          <p className="text-base text-soft">{t('cart.empty')}</p>
          <button type="button" onClick={goMenu} className={primary}>{t('cart.goMenu')}</button>
        </section>
      </div>
    )
  }

  const own = mine(cart)
  const theirs = others(cart)
  // El total del botón va en mono: se parte el copy alrededor de la cifra para no duplicar el texto en es.json.
  const amount = formatCop(cart.total)
  const [before, after] = t('cart.confirm', { amount }).split(amount)
  return (
    <div className={shell}>
      {head}
      <div role="tablist" aria-label={t('cart.title')} className="grid grid-cols-2 gap-1 p-1 rounded-rest bg-muted">
        {TABS.map((k) => (
          <button key={k} ref={(el) => { tabRefs.current[k] = el }} type="button" role="tab" id={`tab-${k}`} aria-selected={tab === k} aria-controls="panel-cart" tabIndex={tab === k ? 0 : -1} onClick={() => setTab(k)} onKeyDown={onTabKey} className={tabClass(k)}>{t(TAB_LABEL[k])}</button>
        ))}
      </div>
      <div role="tabpanel" id="panel-cart" aria-labelledby={`tab-${tab}`} className="flex flex-col">
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
                  <button type="button" aria-label={`${t('cart.remove')}: ${l.nombre}`} disabled={busy} onClick={() => void remove(l.id)} className="h-tap-min px-2 text-[15px] font-medium text-busy-ink disabled:opacity-50">{t('cart.remove')}</button>
                </div>
              </Line>
            ))}
          </ul>
        ) : tab === 'mine' && (
          <div className="py-6 flex flex-col items-center gap-3 text-center">
            <p className="text-soft">{t('cart.empty')}</p>
            <button type="button" onClick={goMenu} className="h-tap px-6 rounded-rest bg-surface border border-border text-base font-medium">{t('cart.goMenu')}</button>
          </div>
        )}
        {tab === 'table' && (
          <section className="flex flex-col">
            {theirs.length > 0
              ? <h2 className="pt-4 pb-1 text-[15px] font-medium text-soft">{t('cart.others')}</h2>
              : <p className="pt-4 text-[15px] text-soft">{t('cart.othersEmpty')}</p>}
            {theirs.length > 0 && <ul className="flex flex-col">{theirs.map((l) => <Line key={l.id} line={l} noteLabel={t('cart.note')} />)}</ul>}
          </section>
        )}
      </div>
      <Link href={menuPath} className="self-start inline-flex items-center h-tap-min text-[15px] font-medium text-brand">{t('cart.addMore')}</Link>
      {/* Pie pegado abajo: la lista scrollea por encima y lo que se va a pagar nunca sale del viewport (§06). */}
      <div className="sticky bottom-0 bg-canvas pt-3 pb-[18px] flex flex-col gap-4">
        <dl className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between"><dt className="text-[15px] text-soft">{t('cart.subtotalMine')}</dt><dd className="font-mono tabular text-[15px]">$ {formatCop(cart.mio)}</dd></div>
          <div className="flex items-baseline justify-between"><dt className="text-lg font-medium">{t('cart.subtotalTable')}</dt><dd className="font-mono tabular text-[24px]">$ {amount}</dd></div>
        </dl>
        <button type="button" disabled={busy || sending} onClick={() => void onConfirm()} className="h-tap-money rounded-rest bg-brand text-brand-ink text-[17px] font-medium disabled:opacity-60">
          {sending ? t('cart.confirming') : <>{before}<span className="font-mono tabular">{amount}</span>{after}</>}
        </button>
      </div>
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
