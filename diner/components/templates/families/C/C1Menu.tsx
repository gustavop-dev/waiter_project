'use client'

import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useState } from 'react'

import { EmptyList, SearchField, footClass, money, price } from '@/components/templates/families/C/parts'
import { CategoryTabs, fold, tabId } from '@/components/templates/generic/menuParts'
import type { MenuLayoutProps } from '@/components/templates/types'
import { itemCount } from '@/lib/domain/cart'
import type { Dish } from '@/lib/types'

// C1 · Combos numerados (docs/diseno/plantillas/C1). Marco oscuro: cabecera con el nombre del restaurante en la voz de la
// plantilla (Bebas Neue 30), lista de filas-tarjeta con el número del combo en ámbar (= posición del producto en su categoría),
// nombre 17/700, subtítulo (descripción o «El más pedido») y precio mono 17; nota de uso y CTA «PEDIR EL {n}» de 60 px.
// Waiter pone el buscador y las pestañas de categoría bajo la cabecera (el marco no las dibuja). En «Todo» se listan todas las
// categorías, cada una con su numeración, para no ocultar platos. Un toque en la fila la selecciona (aria-pressed) y el CTA la
// pide (onAdd); tocar la fila ya seleccionada abre su ficha (onOpen). Sin selección, el CTA lleva al pedido (orderBarHref).
// Datos no estándar omitidos: esperaMinutos (chip rojo de espera).
export function C1Menu({ entry, query, setQuery, category, setCategory, onOpen, onAdd, cart, orderBarHref }: MenuLayoutProps) {
  const t = useTranslations('diner')
  const tc = useTranslations('diner.templates.C1')
  const categories = entry.carta.categorias
  const [selected, setSelected] = useState<{ dish: Dish; n: number } | null>(null)
  const needle = fold(query)
  // El número es la posición en la categoría antes de filtrar: «PEDIR EL 2» sigue siendo el 2 aunque se busque.
  const groups = (category === null ? categories : categories.filter((c) => c.id === category))
    .map((c) => ({ id: c.id, nombre: c.nombre, rows: c.productos.map((dish, i) => ({ dish, n: i + 1 })).filter(({ dish }) => !needle || fold(dish.nombre).includes(needle)) }))
    .filter((g) => g.rows.length > 0)
  const reset = () => { setQuery(''); setCategory(null) }
  const tap = (dish: Dish, n: number) => {
    if (dish.agotado) return
    if (selected?.dish.id === dish.id) onOpen(dish)
    else setSelected({ dish, n })
  }
  const order = () => { if (selected) { onAdd(selected.dish); setSelected(null) } }
  const subtitle = (dish: Dish) => (dish.descripcion ? dish.descripcion.split('\n')[0] : dish.favorito ? tc('mostOrdered') : null)
  const count = itemCount(cart)
  const cta = 'h-[60px] rounded-t-boton bg-t-acento text-t-acento-tinta t-title text-[26px] leading-none grid place-items-center'
  return (
    <div className="flex flex-col text-t-tinta">
      <header className="px-5 py-[18px] border-b border-t-borde flex items-center justify-between gap-3">
        <span className="t-title text-[30px] leading-none truncate">{entry.contexto.marca.nombre}</span>
      </header>
      <div className="px-5 pt-3 flex flex-col gap-2.5">
        <SearchField query={query} setQuery={setQuery} />
        <CategoryTabs categories={categories} category={category} setCategory={setCategory} />
      </div>
      <section role="tabpanel" aria-labelledby={tabId(category)} className="px-5 py-3.5 flex flex-col gap-2.5">
        {groups.length === 0 && <EmptyList query={query} category={category} reset={reset} />}
        {groups.map((g) => (
          <div key={g.id} className="flex flex-col gap-2.5">
            {category === null && groups.length > 1 && <h2 className="pt-1 text-[12px] tracking-[0.12em] uppercase text-t-tinta-terciaria">{g.nombre}</h2>}
            {g.rows.map(({ dish, n }) => {
              const active = selected?.dish.id === dish.id
              const sub = subtitle(dish)
              return (
                <button key={dish.id} type="button" aria-pressed={active} aria-label={tc('select', { n, name: dish.nombre })} disabled={dish.agotado} onClick={() => tap(dish, n)}
                  className={`w-full text-left flex items-center gap-3.5 p-3 rounded-t-tarjeta bg-t-superficie border-2 ${active ? 'border-t-acento' : 'border-transparent'} ${dish.agotado ? 'opacity-55' : ''}`}>
                  <span aria-hidden="true" className="t-title text-[40px] leading-[0.9] w-[42px] shrink-0 text-t-acento">{n}</span>
                  <span className="flex-1 min-w-0 flex flex-col">
                    <span className="text-[17px] font-bold leading-tight">{dish.nombre}</span>
                    {sub && <span className="text-[13px] text-t-tinta-suave leading-snug line-clamp-1">{sub}</span>}
                  </span>
                  {dish.agotado
                    ? <span className="text-[12px] font-medium text-busy-ink shrink-0">{t('common.soldOut')}</span>
                    : <span className="font-t-mono tabular text-[17px] shrink-0">{price(dish.precio)}</span>}
                </button>
              )
            })}
          </div>
        ))}
        {groups.length > 0 && <p className="pt-1 text-[13px] text-t-tinta-terciaria">{tc('note')}</p>}
      </section>
      <div className={`${footClass(cart)} px-5 py-4 border-t border-t-borde bg-t-fondo`}>
        {selected
          ? <button type="button" onClick={order} className={`w-full ${cta}`}>{tc('order', { n: selected.n })}</button>
          : <Link href={orderBarHref} className={`${cta} whitespace-nowrap ${count > 0 ? 'text-[22px]' : ''}`}>{count > 0 ? <span>{tc('seeOrder')} · <span className="font-t-mono tabular normal-case tracking-normal text-[18px]">{money(cart?.total ?? 0)}</span></span> : tc('seeOrder')}</Link>}
      </div>
    </div>
  )
}
