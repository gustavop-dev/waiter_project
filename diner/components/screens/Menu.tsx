'use client'

import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import { DishCard } from '@/components/ui/DishCard'
import { pathFor } from '@/lib/domain/route'
import { useDinerStore } from '@/lib/stores/dinerStore'
import type { Dish, Entry } from '@/lib/types'

// Búsqueda tolerante: "aji" encuentra "Ají" y "AJÍ" (NFD separa la tilde en una marca combinante, que se quita; luego minúsculas).
const fold = (s: string) => s.normalize('NFD').replace(/\p{Mn}/gu, '').toLowerCase().trim()
// Un plato puede vivir en varias categorías; en "Todo" se muestra una sola vez.
const unique = (dishes: Dish[]) => Array.from(new Map(dishes.map((d) => [d.id, d])).values())

// Carta (sistema de diseño §06): título en la serif del restaurante, buscador, chips de categoría y rejilla de tarjetas.
export function Menu({ entry, rest, venue, token }: { entry: Entry; rest: string; venue: string; token: string | null; id: string | null }) {
  const t = useTranslations('diner.menu')
  const router = useRouter()
  const { add } = useDinerStore()
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<number | null>(null)
  const categories = entry.carta.categorias
  const dishes = useMemo(() => {
    const pool = category === null ? unique(categories.flatMap((c) => c.productos)) : categories.find((c) => c.id === category)?.productos ?? []
    const needle = fold(query)
    return needle ? pool.filter((d) => fold(d.nombre).includes(needle)) : pool
  }, [categories, category, query])
  // El chip activo lleva el color del restaurante; el estado también va en aria-pressed, no solo en el color.
  const chip = (active: boolean) => `shrink-0 h-tap-min px-4 rounded-r text-[15px] font-medium whitespace-nowrap ${active ? 'bg-brand text-brand-ink' : 'bg-surface border border-border text-ink'}`
  return (
    <div className="flex flex-col gap-4 pt-[22px]">
      <section className="px-[18px] flex flex-col gap-3">
        <h1 className="font-display text-[32px] leading-tight">{t('title')}</h1>
        <input type="search" aria-label={t('search')} placeholder={t('search')} value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" className="h-tap-min w-full rounded-r bg-surface border border-border px-4 text-base placeholder:text-ink-3" />
      </section>
      <div className="flex gap-2 overflow-x-auto px-[18px] pb-1 [scrollbar-width:none]">
        <button type="button" aria-pressed={category === null} onClick={() => setCategory(null)} className={chip(category === null)}>{t('all')}</button>
        {categories.map((c) => <button key={c.id} type="button" aria-pressed={category === c.id} onClick={() => setCategory(c.id)} className={chip(category === c.id)}>{c.nombre}</button>)}
      </div>
      <section className="px-[18px]">
        {dishes.length === 0
          ? <p role="status" className="py-10 text-center text-base text-soft">{t('empty')}</p>
          : <div className="grid grid-cols-2 gap-3">{dishes.map((d) => <DishCard key={d.id} dish={d} onOpen={(x) => router.push(pathFor(rest, venue, token, 'plato', x.id))} onAdd={(x) => void add(x.id, 1, '')} />)}</div>}
      </section>
    </div>
  )
}
