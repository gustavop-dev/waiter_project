'use client'

import { useTranslations } from 'next-intl'

import { fold } from '@/components/templates/generic/menuParts'
import { formatCop, itemCount } from '@/lib/domain/cart'
import type { Cart, Category, Dish } from '@/lib/types'

// Piezas compartidas por la familia C (Rápida y food truck): pie pegado abajo, buscador compacto, foto con recorte y extras.

// Códigos de la familia: el carrito y el pago ramifican por código (el registro solo admite claves por familia).
export type FamilyCCode = 'C1' | 'C2' | 'C3' | 'C4' | 'C5'
export const familyCCode = (code: string): FamilyCCode => (['C1', 'C2', 'C3', 'C4', 'C5'].includes(code) ? (code as FamilyCCode) : 'C1')
// C1 y C4 son las pieles oscuras con Bebas Neue: sus títulos van más grandes que los de las claras (Ubuntu 700).
export const isDarkC = (code: FamilyCCode) => code === 'C1' || code === 'C4'

// El pie del marco va pegado abajo. La barra oscura de Waiter (OrderBar) la pinta la página, fija, cuando hay ítems:
// el pie se levanta 92 px (18 de margen + 64 de barra + 10 de aire) para no quedar debajo de ella.
export const footClass = (cart: Cart | null) => `sticky z-10 ${itemCount(cart) > 0 ? 'bottom-[92px]' : 'bottom-0'}`

// Precio de lista de la familia: sin símbolo y con separador de miles («41.900»); los totales llevan «$ ».
export const price = (n: number) => formatCop(n)
export const money = (n: number) => `$ ${formatCop(n)}`

// Categoría de extras (Adiciones / Extras / Complementos): el upsell «¿Le sumas…?» sale de ahí cuando la carta la tiene
// (spec C5: «dato no estándar complemento, o categoría de extras»); sin esa categoría no hay upsell, nunca se inventa.
export const extrasOf = (categories: Category[], except: number[] = []): Dish[] =>
  categories.find((c) => /adicion|extra|complemento/.test(fold(c.nombre)))?.productos.filter((d) => !d.agotado && !except.includes(d.id)) ?? []

// Buscador de Waiter en la piel de la plantilla (44 px de toque).
export function SearchField({ query, setQuery, className = '' }: { query: string; setQuery: (q: string) => void; className?: string }) {
  const t = useTranslations('diner.menu')
  return (
    <input type="search" aria-label={t('search')} placeholder={t('search')} value={query} onChange={(e) => setQuery(e.target.value)} autoComplete="off" className={`h-11 w-full min-w-0 rounded-t-boton bg-t-superficie border border-t-borde px-3.5 text-[15px] text-t-tinta placeholder:text-t-tinta-terciaria focus:outline-none focus:border-t-acento ${className}`} />
  )
}

// Foto con recorte por object-cover; placeholder «Foto del plato» (#F2EEE8 = bg-muted) si no hay; agotado al 55 % con insignia.
export function DishPhoto({ dish, className = '' }: { dish: Dish; className?: string }) {
  const t = useTranslations('diner')
  return (
    <div className={`relative bg-muted grid place-items-center text-[11px] tracking-[0.1em] uppercase text-ink-3 overflow-hidden ${className}`}>
      {/* La foto viene de experience por URL y next.config la sirve sin optimizar (images.unoptimized). */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {dish.foto ? <img src={dish.foto} alt="" className={`w-full h-full object-cover ${dish.agotado ? 'opacity-55' : ''}`} /> : <span>{t('templates.photo')}</span>}
      {dish.agotado && <span data-testid="sold-out-badge" className="absolute top-2 right-2 rounded-t-chip bg-t-superficie/90 px-2 py-0.5 text-[11px] font-medium tracking-[0.04em] normal-case text-busy-ink">{t('common.soldOut')}</span>}
    </div>
  )
}

// Estado vacío honesto de una lista filtrada: habla de la búsqueda solo si se buscó.
export function EmptyList({ query, category, reset }: { query: string; category: number | null; reset: () => void }) {
  const t = useTranslations('diner')
  const text = query ? t('menu.empty') : category === null ? t('menu.emptyMenu') : t('menu.emptyCategory')
  return (
    <div className="py-8 flex flex-col items-center gap-3 text-center">
      <p role="status" className="text-[15px] text-t-tinta-suave">{text}</p>
      {(query !== '' || category !== null) && <button type="button" onClick={reset} className="h-11 px-4 rounded-t-boton bg-t-superficie border border-t-borde text-[14px] font-medium text-t-tinta">{t('home.seeAll')}</button>}
    </div>
  )
}
