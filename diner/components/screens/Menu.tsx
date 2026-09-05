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
// null es "Todo"; el id enlaza cada pestaña con el panel (aria-labelledby).
const tabId = (category: number | null) => (category === null ? 'cat-all' : `cat-${category}`)

// Carta (sistema de diseño §06): título en la serif del restaurante, buscador, chips de categoría y rejilla de tarjetas.
export function Menu({ entry, rest, venue, token }: { entry: Entry; rest: string; venue: string; token: string | null; id: string | null }) {
  const t = useTranslations('diner')
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
  // Estado vacío honesto: solo habla de búsqueda si el comensal buscó; si no, es la categoría (o la carta entera) la que no tiene platos.
  const emptyText = query ? t('menu.empty') : category === null ? t('menu.emptyMenu') : t('menu.emptyCategory')
  const filtered = query !== '' || category !== null
  const showAll = () => { setQuery(''); setCategory(null) }
  // Los chips son pestañas excluyentes (una sola activa): el lector de pantalla anuncia "pestaña, seleccionada, 2 de 3" y el foco rota con ←/→.
  const values: (number | null)[] = [null, ...categories.map((c) => c.id)]
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const index = values.indexOf(category)
    const target = e.key === 'ArrowRight' ? index + 1 : e.key === 'ArrowLeft' ? index - 1 : e.key === 'Home' ? 0 : e.key === 'End' ? values.length - 1 : null
    if (target === null) return
    e.preventDefault()
    const next = values[(target + values.length) % values.length] ?? null
    setCategory(next)
    document.getElementById(tabId(next))?.focus()
  }
  // El chip activo lleva el color del restaurante; el estado también va en aria-selected, no solo en el color.
  const chip = (active: boolean) => `shrink-0 h-tap-min px-4 rounded-rest text-[15px] font-medium whitespace-nowrap ${active ? 'bg-brand text-brand-ink' : 'bg-surface border border-border text-ink'}`
  const tab = (value: number | null, label: string) => {
    const active = category === value
    return <button key={tabId(value)} type="button" role="tab" id={tabId(value)} aria-selected={active} tabIndex={active ? 0 : -1} onClick={() => setCategory(value)} className={chip(active)}>{label}</button>
  }
  return (
    <div className="flex flex-col gap-4 pt-[22px]">
      <section className="px-[18px] flex flex-col gap-3">
        <h1 className="font-display text-[32px] leading-tight">{t('menu.title')}</h1>
        <input type="search" aria-label={t('menu.search')} placeholder={t('menu.search')} value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" className="h-tap-min w-full rounded-rest bg-surface border border-border px-4 text-base placeholder:text-ink-3" />
      </section>
      <div role="tablist" aria-label={t('menu.categories')} onKeyDown={onKeyDown} className="flex gap-2 overflow-x-auto px-[18px] pb-1 [scrollbar-width:none]">
        {tab(null, t('menu.all'))}
        {categories.map((c) => tab(c.id, c.nombre))}
      </div>
      {/* Límite legal: si algún plato lleva foto generada con IA, la carta lo dice una vez, antes de la rejilla. Es de la carta entera, no del filtro. */}
      {entry.carta.imagenesDeReferencia && <p className="px-[18px] text-[13px] text-soft">{t('menu.referenceImages')}</p>}
      <section role="tabpanel" aria-labelledby={tabId(category)} className="px-[18px]">
        {dishes.length === 0
          ? (
            <div className="py-10 flex flex-col items-center gap-4 text-center">
              <p role="status" className="text-base text-soft">{emptyText}</p>
              {filtered && <button type="button" onClick={showAll} className="h-tap-min px-[18px] rounded-rest bg-surface border border-border text-[15px] font-medium">{t('home.seeAll')}</button>}
            </div>
          )
          : <div className="grid grid-cols-2 gap-3">{dishes.map((d) => <DishCard key={d.id} dish={d} onOpen={(x) => router.push(pathFor(rest, venue, token, 'plato', x.id))} onAdd={(x) => void add(x.id, 1, '')} />)}</div>}
      </section>
    </div>
  )
}
