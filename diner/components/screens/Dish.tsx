'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useState } from 'react'

import { formatCop } from '@/lib/domain/cart'
import { pathFor } from '@/lib/domain/route'
import { useDinerStore } from '@/lib/stores/dinerStore'
import type { Entry } from '@/lib/types'

// Tiempo en que se alcanza a leer "Agregado a tu pedido" antes de volver a la carta.
const ADDED_DELAY_MS = 700

// Plato (sistema de diseño §06): foto 4:3, nombre en la serif del restaurante, nota, cantidad y una sola acción en el color del restaurante.
export function Dish({ entry, rest, venue, token, id }: { entry: Entry; rest: string; venue: string; token: string | null; id: string | null }) {
  const t = useTranslations('diner')
  const router = useRouter()
  const { add, busy } = useDinerStore()
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState('')
  const [added, setAdded] = useState(false)
  const menuPath = pathFor(rest, venue, token, 'carta')
  const dish = id === null ? undefined : entry.carta.categorias.flatMap((c) => c.productos).find((d) => String(d.id) === id)
  useEffect(() => {
    if (!added) return
    const timer = setTimeout(() => router.push(menuPath), ADDED_DELAY_MS)
    return () => clearTimeout(timer)
  }, [added, router, menuPath])
  if (!dish) {
    return (
      <section className="px-[18px] pt-[22px] flex flex-col items-start gap-4">
        <p className="text-base text-soft">{t('common.unavailable')}</p>
        <button type="button" onClick={() => router.push(menuPath)} className="h-tap-min px-[18px] rounded-r bg-surface border border-border text-base font-medium">{t('common.back')}</button>
      </section>
    )
  }
  // El total del botón va en mono: se parte el copy alrededor de la cifra para no duplicar el texto en es.json.
  const amount = formatCop(dish.precio * qty)
  const [before, after] = t('dish.addFor', { amount }).split(amount)
  const submit = async () => {
    await add(dish.id, qty, note.trim())
    // El store guarda el error (la página lo pinta); solo se confirma y se vuelve a la carta si el plato entró.
    if (!useDinerStore.getState().error) setAdded(true)
  }
  return (
    <div className="flex flex-col gap-4 pt-3">
      <Link href={menuPath} className="mx-[18px] self-start inline-flex items-center h-tap-min text-[15px] font-medium">← {t('common.back')}</Link>
      <div className="mx-[18px] aspect-[4/3] rounded-r bg-muted overflow-hidden grid place-items-center text-[11px] tracking-[0.08em] uppercase text-ink-3">
        {dish.foto ? <img src={dish.foto} alt={dish.nombre} className="w-full h-full object-cover" /> : t('home.photo')}
      </div>
      <section className="px-[18px] flex flex-col gap-2">
        <h1 className="font-display text-[28px] leading-tight">{dish.nombre}</h1>
        {dish.descripcion && <p className="text-base text-soft">{dish.descripcion}</p>}
        <span className="font-mono tabular text-lg">{formatCop(dish.precio)}</span>
      </section>
      <section className="px-[18px] flex flex-col gap-3">
        <div role="group" aria-label={t('dish.qty')} className="flex items-center justify-between">
          <span className="text-[15px] font-medium">{t('dish.qty')}</span>
          <div className="inline-flex items-center rounded-r bg-surface border border-border overflow-hidden">
            <button type="button" aria-label={t('dish.fewer')} disabled={qty <= 1} onClick={() => setQty((q) => Math.max(1, q - 1))} className="w-tap-min h-tap-min grid place-items-center text-xl disabled:text-ink-3">−</button>
            <span aria-live="polite" className="font-mono tabular min-w-[40px] text-center text-lg">{qty}</span>
            <button type="button" aria-label={t('dish.more')} onClick={() => setQty((q) => q + 1)} className="w-tap-min h-tap-min grid place-items-center text-xl">+</button>
          </div>
        </div>
        <textarea aria-label={t('dish.note')} placeholder={t('dish.note')} value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={200} className="w-full rounded-r bg-surface border border-border px-4 py-3 text-base placeholder:text-ink-3" />
        <button type="button" disabled={dish.agotado || busy || added} onClick={() => void submit()} className="h-tap-money rounded-r bg-brand text-brand-ink text-lg font-medium disabled:opacity-60">
          {dish.agotado ? t('common.soldOut') : <>{before}<span className="font-mono tabular">{amount}</span>{after}</>}
        </button>
        <p role="status" className="min-h-6 text-center text-[15px] font-medium text-free-ink">{added ? t('dish.added') : null}</p>
      </section>
    </div>
  )
}
