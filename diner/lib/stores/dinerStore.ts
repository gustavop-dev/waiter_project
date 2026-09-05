'use client'

import { create } from 'zustand'

import { ApiError, addLine, callWaiter, confirmOrder, getCart, getEntry, getOrder, openSession, removeLine, requestBill, updateLine } from '@/lib/services/api'
import type { Bill, Cart, Entry, OrderStatus, Session } from '@/lib/types'

interface Keys { rest: string; venue: string; token: string | null }
interface DinerState {
  keys: Keys | null
  entry: Entry | null
  session: Session | null
  cart: Cart | null
  order: OrderStatus | null
  bill: Bill | null
  error: string | null
  busy: boolean
  load: (keys: Keys) => Promise<void>
  ensureSession: () => Promise<Session | null>
  refreshCart: () => Promise<void>
  add: (productId: number, qty: number, note: string) => Promise<void>
  setQty: (lineId: number, qty: number) => Promise<void>
  remove: (lineId: number) => Promise<void>
  confirm: () => Promise<string | null>
  refreshOrder: (orderId: string) => Promise<void>
  call: () => Promise<boolean>
  askBill: () => Promise<Bill | null>
}

const message = (e: unknown) => (e instanceof ApiError ? e.message : e instanceof Error ? e.message : String(e))

export const useDinerStore = create<DinerState>((set, get) => {
  const run = async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    set({ busy: true, error: null })
    try { return await fn() } catch (e) { set({ error: message(e) }); return null } finally { set({ busy: false }) }
  }
  return {
    keys: null, entry: null, session: null, cart: null, order: null, bill: null, error: null, busy: false,
    // Entrada: contexto + carta. La sesión (cookie del comensal) se abre al primer gesto que la necesite.
    load: async (keys) => {
      const same = get().keys && JSON.stringify(get().keys) === JSON.stringify(keys)
      if (!same) set({ keys, entry: null, session: null, cart: null, order: null, bill: null })
      await run(async () => { const entry = await getEntry(keys.rest, keys.venue, keys.token); set({ entry }) })
    },
    ensureSession: async () => {
      const { session, keys } = get()
      if (session || !keys) return session
      return run(async () => { const r = await openSession(keys.rest, keys.venue, keys.token); set({ session: r.sesion }); return r.sesion })
    },
    refreshCart: async () => {
      const session = await get().ensureSession()
      if (!session) return
      await run(async () => set({ cart: await getCart(session.id) }))
    },
    add: async (productId, qty, note) => {
      const session = await get().ensureSession()
      if (!session) return
      await run(async () => set({ cart: await addLine(session.id, productId, qty, note) }))
    },
    setQty: async (lineId, qty) => {
      const session = get().session
      if (!session) return
      await run(async () => set({ cart: await updateLine(session.id, lineId, { cantidad: qty }) }))
    },
    remove: async (lineId) => {
      const session = get().session
      if (!session) return
      await run(async () => set({ cart: await removeLine(session.id, lineId) }))
    },
    // Idempotente en el servidor: tocar dos veces devuelve el mismo pedido. Si Odoo no responde, el carrito sigue ahí.
    confirm: async () => {
      const session = get().session
      if (!session) return null
      return run(async () => { const r = await confirmOrder(session.id); const order = await getOrder(r.pedido); set({ order, cart: await getCart(session.id) }); return r.pedido })
    },
    refreshOrder: async (orderId) => { await run(async () => set({ order: await getOrder(orderId) })) },
    call: async () => {
      const session = await get().ensureSession()
      if (!session) return false
      return (await run(() => callWaiter(session.id))) ?? false
    },
    askBill: async () => {
      const session = await get().ensureSession()
      if (!session) return null
      return run(async () => { const bill = await requestBill(session.id); set({ bill }); return bill })
    },
  }
})
