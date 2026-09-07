'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

import { orderStatus, progressPercent, type KitOrder, type KitStatus } from '@/lib/domain/orderState'
import { listKitOrders } from '@/lib/services/ordersKit'
import { useAuthStore } from '@/lib/stores/authStore'
import { useCatalogStore } from '@/lib/stores/catalogStore'
import { useNotificationStore } from '@/lib/stores/notificationStore'
import { useOrderStore } from '@/lib/stores/orderStore'

const POLL_MS = 10_000

// Pedidos abiertos del turno en el lenguaje del kit, sondeados cada 10 s. "Esperando pago" sale de la bandera local
// `billing` del orderStore o de que el comensal pidiera la cuenta desde su móvil (llamada de mesa en Odoo).
export function useKitOrders() {
  const session = useAuthStore((s) => s.session)
  const catalog = useCatalogStore((s) => s.catalog)
  const flags = useOrderStore((s) => s.flags)
  const calls = useOrderStore((s) => s.calls)
  const refreshOpenOrders = useOrderStore((s) => s.refreshOpenOrders)
  const [orders, setOrders] = useState<KitOrder[]>([])
  const [loaded, setLoaded] = useState(false)
  const tableNumberOf = useCallback((id: number) => catalog?.tables.find((t) => t.id === id)?.number ?? null, [catalog])

  // Sin la carta cargada no se sabe el número de las mesas: pedir ahora dejaría las tarjetas sin su chip azul
  // hasta el siguiente sondeo. Al llegar la carta, `refresh` cambia y el efecto vuelve a pedir enseguida.
  const refresh = useCallback(async () => {
    if (!session || !catalog) return
    try {
      const [list] = await Promise.all([listKitOrders(session.id, tableNumberOf), refreshOpenOrders(session.id)])
      setOrders(list)
    } catch (e) {
      console.warn('No se pudieron refrescar los pedidos; se muestra lo último conocido.', e)
    } finally {
      setLoaded(true)
    }
  }, [session, catalog, tableNumberOf, refreshOpenOrders])

  useEffect(() => {
    // Primera carga fuera del cuerpo del efecto (sin setState síncrono) y sondeo periódico después.
    const first = setTimeout(() => { void refresh() }, 0)
    const id = setInterval(() => { void refresh() }, POLL_MS)
    return () => { clearTimeout(first); clearInterval(id) }
  }, [refresh])
  // Un plato listo no espera al siguiente sondeo: el aviso de cocina, que llega cada 5 s, releé los pedidos.
  const kitchenPing = useNotificationStore((s) => s.kitchenPing)
  useEffect(() => { if (kitchenPing > 0) void refresh() }, [kitchenPing, refresh])

  const billingOf = useCallback((o: KitOrder) => o.tableId !== null && (Boolean(flags[o.tableId]?.billing) || calls.some((c) => c.tableId === o.tableId && c.kind === 'bill')), [flags, calls])
  const statusOf = useCallback((o: KitOrder): KitStatus => orderStatus(o, billingOf(o)), [billingOf])
  const percentOf = useCallback((o: KitOrder) => progressPercent(o), [])
  return useMemo(() => ({ orders, loaded, refresh, statusOf, percentOf }), [orders, loaded, refresh, statusOf, percentOf])
}
