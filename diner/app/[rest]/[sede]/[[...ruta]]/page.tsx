'use client'

import { useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useEffect, useMemo } from 'react'

import { Bill } from '@/components/screens/Bill'
import { Cart } from '@/components/screens/Cart'
import { Dish } from '@/components/screens/Dish'
import { Home } from '@/components/screens/Home'
import { Menu } from '@/components/screens/Menu'
import { Status } from '@/components/screens/Status'
import { BrandHeader } from '@/components/ui/BrandHeader'
import { OrderBar } from '@/components/ui/OrderBar'
import { Seal } from '@/components/ui/Seal'
import { parseRoute, pathFor } from '@/lib/domain/route'
import { themeVars } from '@/lib/domain/theme'
import { useDinerStore } from '@/lib/stores/dinerStore'

const SCREEN = { portada: Home, carta: Menu, plato: Dish, pedido: Cart, estado: Status, cuenta: Bill } as const

export default function DinerPage() {
  const t = useTranslations('diner.common')
  const params = useParams<{ rest: string; sede: string; ruta?: string[] }>()
  const route = useMemo(() => parseRoute(params.ruta), [params.ruta])
  const { entry, cart, error, load, refreshCart, session } = useDinerStore()
  const keys = useMemo(() => ({ rest: params.rest, venue: params.sede, token: route.token }), [params.rest, params.sede, route.token])

  useEffect(() => { void load(keys) }, [keys, load])
  // Con sesión abierta, el carrito de la mesa se refresca al entrar a cada pantalla (otros comensales también piden).
  useEffect(() => { if (session) void refreshCart() }, [session, route.screen, refreshCart])

  if (!entry) return <main className="min-h-screen grid place-items-center p-6 text-center text-soft">{error ? t('unavailable') : t('loading')}</main>
  const Screen = SCREEN[route.screen]
  const style = themeVars(entry.contexto.marca) as React.CSSProperties
  return (
    <main style={style} className="min-h-screen bg-canvas pb-28">
      <BrandHeader brand={entry.contexto.marca} table={entry.contexto.mesa?.numero ?? null} />
      {error && <p role="alert" className="mx-[18px] mt-3 px-3.5 py-2.5 rounded-rest bg-busy-soft text-busy-ink text-[15px]">{error}</p>}
      <Screen entry={entry} rest={keys.rest} venue={keys.venue} token={keys.token} id={route.id} />
      <Seal />
      {route.screen !== 'pedido' && route.screen !== 'cuenta' && <OrderBar cart={cart} href={pathFor(keys.rest, keys.venue, keys.token, 'pedido')} />}
    </main>
  )
}
