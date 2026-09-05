'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { GenericPay } from '@/components/templates/generic/GenericPay'
import { PAY_LAYOUTS } from '@/components/templates/registry'
import { pathFor } from '@/lib/domain/route'
import { DEFAULT_TEMPLATE, familyOf } from '@/lib/domain/template'
import { payableTotal, useDinerStore } from '@/lib/stores/dinerStore'
import type { Bill, Entry, PayMethod } from '@/lib/types'

export const PAY_METHODS: PayMethod[] = ['tarjeta', 'pse', 'nequi', 'efectivo']

// Pago desde el celular (maquetado): no avisa al salón (eso es «la cuenta»). El monto es la cuenta si ya se pidió, si no el pedido
// confirmado, si no el carrito. El contenedor enruta y delega el dibujo al pago de la familia de la plantilla.
export function Pay({ entry, rest, venue, token }: { entry: Entry; rest: string; venue: string; token: string | null; id: string | null }) {
  const router = useRouter()
  const store = useDinerStore()
  const { cart, order, bill, account, payState, payResult, simulatePay, resetPay, refreshCart } = store
  const template = store.template ?? DEFAULT_TEMPLATE
  // Al entrar directo por URL no hay carrito en memoria: se relee para tener un monto. Al salir se limpia el estado del pago.
  useEffect(() => { void refreshCart(); return () => resetPay() }, [refreshCart, resetPay])
  const Layout = PAY_LAYOUTS[familyOf(template.layouts?.pago, template.familia)] ?? GenericPay
  const go = (screen: Parameters<typeof pathFor>[3]) => router.push(pathFor(rest, venue, token, screen))
  const total = payableTotal({ bill, order, cart })
  const shown: Bill = bill ?? { ok: false, total, mio: order?.total ?? cart?.mio ?? total, porComensal: [], partes: 1, porParte: total, descuento: cart?.descuento }
  return (
    <Layout
      bill={shown} template={template} methods={PAY_METHODS} onPay={(m) => void simulatePay(m)} state={payState} demo goBack={() => go('pedido')}
      result={payResult} order={order} merchant={entry.contexto.restaurante.nombre} table={entry.contexto.mesa?.numero ?? null} account={account}
      onRetry={resetPay} onPayAtTable={() => go('la-cuenta')} onSignup={() => go('cuenta/registro')} goMenu={() => go('carta')}
    />
  )
}
