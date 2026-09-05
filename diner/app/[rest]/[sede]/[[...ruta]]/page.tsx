'use client'

import { useParams, useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Suspense, useEffect, useMemo } from 'react'
import type { ComponentType } from 'react'

import { Account } from '@/components/screens/Account'
import { Bill } from '@/components/screens/Bill'
import { Cart } from '@/components/screens/Cart'
import { Code } from '@/components/screens/Code'
import { Dish } from '@/components/screens/Dish'
import { Home } from '@/components/screens/Home'
import { Menu } from '@/components/screens/Menu'
import { Pay } from '@/components/screens/Pay'
import { Signup } from '@/components/screens/Signup'
import { Status } from '@/components/screens/Status'
import { BrandHeader } from '@/components/ui/BrandHeader'
import { OrderBar } from '@/components/ui/OrderBar'
import { Seal } from '@/components/ui/Seal'
import { parseRoute, pathFor } from '@/lib/domain/route'
import type { Screen } from '@/lib/domain/route'
import { applyGoogleFonts, templateVars } from '@/lib/domain/template'
import { themeVars } from '@/lib/domain/theme'
import { useDinerStore } from '@/lib/stores/dinerStore'
import type { Entry } from '@/lib/types'

type ScreenProps = { entry: Entry; rest: string; venue: string; token: string | null; id: string | null }
const SCREEN: Record<Screen, ComponentType<ScreenProps>> = {
  portada: Home, carta: Menu, plato: Dish, pedido: Cart, estado: Status, 'la-cuenta': Bill,
  pago: Pay, cuenta: Account, 'cuenta/registro': Signup, 'cuenta/codigo': Code,
}
// Pantallas de dinero y de cuenta: la barra de pedido no se pinta encima (ya se está en el pedido o se está pagando / identificando).
const WITHOUT_ORDER_BAR: Screen[] = ['pedido', 'la-cuenta', 'pago', 'cuenta', 'cuenta/registro', 'cuenta/codigo']

function DinerPage() {
  const t = useTranslations('diner.common')
  const tt = useTranslations('diner.templates')
  const params = useParams<{ rest: string; sede: string; ruta?: string[] }>()
  const search = useSearchParams()
  const previewParam = search?.get('vista_previa') ?? null
  const route = useMemo(() => parseRoute(params.ruta), [params.ruta])
  const { entry, cart, error, load, refreshCart, session, template, preview, applyPreviewParam } = useDinerStore()
  const keys = useMemo(() => ({ rest: params.rest, venue: params.sede, token: route.token }), [params.rest, params.sede, route.token])

  // Al entrar (o recargar) se abre/recupera la sesión del comensal por su cookie y se trae el carrito de la mesa:
  // la barra de pedido no puede desaparecer por una recarga.
  useEffect(() => { void load(keys).then(() => refreshCart()) }, [keys, load, refreshCart])
  // Con sesión abierta, el carrito de la mesa se refresca al entrar a cada pantalla (otros comensales también piden).
  useEffect(() => { if (session) void refreshCart() }, [session, route.screen, refreshCart])
  // Vista previa sin guardar (?vista_previa=…, la usa el POS por iframe): reemplaza la plantilla solo en este cliente.
  useEffect(() => { void applyPreviewParam(previewParam) }, [previewParam, applyPreviewParam])
  // Las fuentes de la plantilla se piden a Google una sola vez por familia; las de Waiter y las seis de marca ya vienen del layout.
  useEffect(() => { applyGoogleFonts(template) }, [template])

  if (!entry) return <main className="min-h-screen grid place-items-center p-6 text-center text-soft">{error ? t('unavailable') : t('loading')}</main>
  const Screen = SCREEN[route.screen]
  // Tema de la marca (--r-*, Plan G) + tokens de la plantilla (--t-*, Plan H) en el mismo <main>: las utilidades los leen de aquí.
  const style = { ...themeVars(entry.contexto.marca), ...templateVars(template) } as React.CSSProperties
  return (
    <main style={style} className="min-h-screen bg-t-fondo text-t-tinta font-t-cuerpo pb-28">
      {preview && <p role="status" className="sticky top-0 z-50 mx-[18px] mt-2 px-3 py-1.5 rounded-t-chip bg-pending-soft text-pending-ink text-[12px] font-medium text-center">{tt('preview', { code: preview.codigo })}</p>}
      <BrandHeader brand={entry.contexto.marca} table={entry.contexto.mesa?.numero ?? null} />
      {error && <p role="alert" className="mx-[18px] mt-3 px-3.5 py-2.5 rounded-rest bg-busy-soft text-busy-ink text-[15px]">{error}</p>}
      <Screen entry={entry} rest={keys.rest} venue={keys.venue} token={keys.token} id={route.id} />
      <Seal />
      {!WITHOUT_ORDER_BAR.includes(route.screen) && <OrderBar cart={cart} href={pathFor(keys.rest, keys.venue, keys.token, 'pedido')} />}
    </main>
  )
}

// useSearchParams pide un límite de Suspense por si la ruta se prerrenderiza; esta es dinámica, pero el límite no cuesta nada.
export default function DinerPageBoundary() {
  return <Suspense fallback={null}><DinerPage /></Suspense>
}
