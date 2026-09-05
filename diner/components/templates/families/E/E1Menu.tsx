'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useMemo, useState } from 'react'

import { AddButton, EmptyMenu, MenuSearch, uniqueTags } from '@/components/templates/families/E/parts'
import { CategoryTabs, fold, tabId, useMenuDishes } from '@/components/templates/generic/menuParts'
import type { MenuLayoutProps } from '@/components/templates/types'
import { formatCop, itemCount } from '@/lib/domain/cart'
import type { Dish } from '@/lib/types'

// E1 · Índice de grifos (docs/diseno/plantillas/E1): cabecera «N grifos» + rótulo mono «ABV · IBU» (solo si algún producto trae
// abv/ibu); lista de una columna sin fotos con barra vertical de 8×40, nombre 16/500, línea técnica mono «4.8% · 22 IBU» y precio mono;
// el agotado va al 45 % con «barril vacío» en vez de la línea técnica. La fila «Filtrar:» del marco (sobre superficie, justo encima de
// los botones) es el filtro de Waiter: etiquetas únicas de la carta (aria-pressed), categorías y el buscador plegado tras «Buscar»; se
// pega abajo junto con la barra de acciones para que el filtro siempre esté a mano. «Armar flight» solo aparece si la carta tiene una
// categoría de flights (sin dato estándar); «Pedir ronda» lleva a orderBarHref con cart.total. Sin dato de color de barril, la barra
// usa el borde. El marco no dibuja ＋: va uno de 32 px con borde (44 px de toque) tras el precio; tocar la fila abre el plato.
// La página aún superpone su OrderBar flotante cuando hay ítems (integración pendiente).
export function E1Menu({ entry, query, setQuery, category, setCategory, onOpen, onAdd, cart, orderBarHref }: MenuLayoutProps) {
  const t = useTranslations('diner')
  const te = useTranslations('diner.templates.E1')
  const tf = useTranslations('diner.templates.familiaE')
  const [searching, setSearching] = useState(false)
  const [tag, setTag] = useState<string | null>(null)
  const categories = entry.carta.categorias
  const all = useMenuDishes(categories, query, category)
  const dishes = useMemo(() => (tag ? all.filter((d) => d.atributos?.etiquetas?.includes(tag)) : all), [all, tag])
  const tags = useMemo(() => uniqueTags(categories.flatMap((c) => c.productos)), [categories])
  const hasAbv = useMemo(() => categories.some((c) => c.productos.some((d) => d.atributos?.abv || d.atributos?.ibu)), [categories])
  const flights = useMemo(() => categories.find((c) => fold(c.nombre).includes('flight')), [categories])
  const active = category === null ? null : categories.find((c) => c.id === category)
  const count = itemCount(cart)
  const showAll = () => { setQuery(''); setCategory(null); setTag(null) }
  const amount = formatCop(cart?.total ?? 0)
  const [before, after] = te('roundTotal', { amount }).split(amount)
  const tagChip = (on: boolean) => `shrink-0 h-[44px] px-3 rounded-t-chip text-[13px] whitespace-nowrap ${on ? 'bg-t-acento text-t-acento-tinta font-medium' : 'border border-t-borde text-t-tinta-terciaria'}`
  return (
    <div className="flex flex-col min-h-[60vh] text-t-tinta">
      <header className="px-5 py-[18px] border-b border-t-borde flex items-baseline justify-between gap-3">
        <h1 className="t-title text-[20px] leading-tight">{active ? te('categoryCount', { name: active.nombre, n: dishes.length }) : te('taps', { n: dishes.length })}</h1>
        {hasAbv && <span className="font-t-mono text-[13px] text-t-tinta-suave">{te('abvIbu')}</span>}
      </header>
      {entry.carta.imagenesDeReferencia && <p className="px-5 pt-3 text-[13px] text-t-tinta-suave">{t('menu.referenceImages')}</p>}
      <section role="tabpanel" aria-labelledby={tabId(category)} className="flex-1">
        {dishes.length === 0
          ? <EmptyMenu query={query} category={category} onShowAll={showAll} />
          : <ul className="flex flex-col">{dishes.map((d) => <TapRow key={d.id} dish={d} onOpen={onOpen} onAdd={onAdd} />)}</ul>}
      </section>
      <div className="sticky bottom-0 z-30 bg-t-fondo">
        {(searching || query) && <div className="px-5 pt-3 bg-t-superficie"><MenuSearch query={query} setQuery={setQuery} autoFocus /></div>}
        <div className="px-5 py-3 bg-t-superficie flex items-center gap-2 text-[13px] text-t-tinta-terciaria">
          <button type="button" aria-label={tf('searchToggle')} aria-pressed={searching} onClick={() => setSearching((s) => !s)} className={`shrink-0 w-[44px] h-[44px] -ml-2 rounded-t-chip grid place-items-center text-[17px] ${searching || query ? 'bg-t-acento text-t-acento-tinta' : 'text-t-tinta-terciaria'}`}>⌕</button>
          <span className="shrink-0">{tf('filters')}:</span>
          <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]">
            <CategoryTabs categories={categories} category={category} setCategory={setCategory} className="pb-0 [&>button]:h-[44px] [&>button]:px-3 [&>button]:text-[13px]" />
            {tags.length > 0 && (
              <div role="group" aria-label={tf('tagFilters')} className="flex items-center gap-1.5">
                {tags.map((x) => <button key={x} type="button" aria-pressed={tag === x} onClick={() => setTag((c) => (c === x ? null : x))} className={tagChip(tag === x)}>{x}</button>)}
              </div>
            )}
          </div>
        </div>
        <div className="px-5 py-3.5 border-t border-t-borde flex gap-2.5">
          {flights && <button type="button" onClick={() => { setCategory(flights.id); setTag(null) }} className="flex-1 h-[52px] rounded-t-boton border border-t-borde text-[15px] text-t-tinta-terciaria">{te('flight')}</button>}
          {count > 0
            ? <Link href={orderBarHref} data-testid="frame-order-bar" className="flex-1 h-[52px] rounded-t-boton bg-t-acento text-t-acento-tinta text-[15px] font-bold flex items-center justify-center gap-1">{before}<span className="font-t-mono tabular">{amount}</span>{after}</Link>
            : <button type="button" disabled data-testid="frame-order-bar" className="flex-1 h-[52px] rounded-t-boton bg-t-acento text-t-acento-tinta text-[15px] font-bold disabled:opacity-60">{te('round')}</button>}
        </div>
      </div>
    </div>
  )
}

// Fila de grifo: barra de color (borde: el color del barril no viene en los datos), nombre, técnica o «barril vacío», precio y ＋.
function TapRow({ dish, onOpen, onAdd }: { dish: Dish; onOpen: (d: Dish) => void; onAdd: (d: Dish) => void }) {
  const te = useTranslations('diner.templates.E1')
  const tf = useTranslations('diner.templates.familiaE')
  const a = dish.atributos
  const tech = [a?.abv ? tf('abvShort', { abv: a.abv }) : null, a?.ibu ? tf('ibu', { ibu: a.ibu }) : null].filter(Boolean).join(' · ')
  const fallback = a?.etiquetas && a.etiquetas.length > 0 ? a.etiquetas.join(' · ') : ''
  return (
    <li className={`px-5 border-b border-t-borde flex items-center gap-3 ${dish.agotado ? 'opacity-45' : ''}`}>
      <button type="button" onClick={() => onOpen(dish)} className="flex-1 min-w-0 py-[13px] flex items-center gap-3 text-left min-h-[66px]">
        <span aria-hidden="true" className="w-2 h-10 shrink-0 rounded-[4px] bg-t-borde" />
        <span className="flex-1 min-w-0 flex flex-col">
          <span className="text-[16px] font-medium leading-snug">{dish.nombre}</span>
          {dish.agotado
            ? <span className="text-[13px] text-[#F08A84]">{te('empty')}</span>
            : (tech || fallback) && <span className="font-t-mono text-[13px] text-t-tinta-suave truncate">{tech || fallback}</span>}
        </span>
        <span className="font-t-mono tabular text-[15px] whitespace-nowrap">{formatCop(dish.precio)}</span>
      </button>
      <AddButton dish={dish} onAdd={onAdd} className="-mr-1.5" />
    </li>
  )
}
