'use client'

import { create } from 'zustand'

import { addProduct, createDraft, removeLine, setNote, setQty } from '@/lib/domain/order'
import type { DraftOrder } from '@/lib/domain/order'
import type { LocalFlags } from '@/lib/domain/tableState'
import { fireUnsentLines } from '@/lib/services/kitchen'
import { closeOrder, getShiftSummary, listOpenOrders, payOrder, saveOrder } from '@/lib/services/orders'
import type { OpenOrder, SavedOrder, ShiftSummary } from '@/lib/services/orders'
import type { Product } from '@/lib/types'

interface OrderState {
  draft: DraftOrder | null
  saved: SavedOrder | null
  openOrders: OpenOrder[]
  shift: ShiftSummary | null
  flags: Record<number, LocalFlags>
  busy: boolean
  error: string | null
  start: (sessionId: number, tableId: number, guests: number) => void
  add: (product: Product) => void
  changeQty: (lineUuid: string, qty: number) => void
  note: (lineUuid: string, note: string) => void
  remove: (lineUuid: string) => void
  save: () => Promise<void>
  sendToKitchen: () => Promise<void>
  requestBill: () => Promise<void>
  charge: (paymentMethodId: number) => Promise<void>
  chargeExisting: (orderId: number, tableId: number, total: number, paymentMethodId: number) => Promise<void>
  refreshOpenOrders: (sessionId: number) => Promise<void>
  refreshShift: (sessionId: number) => Promise<void>
}

// El mensaje de Odoo ya viene en el idioma del usuario; no se traduce aquí ni se inventa copy.
const message = (e: unknown) => (e instanceof Error ? e.message : String(e))

export const useOrderStore = create<OrderState>((set, get) => {
  const update = (fn: (d: DraftOrder) => DraftOrder) => {
    const d = get().draft
    if (d) set({ draft: fn(d) })
  }
  const persist = async (): Promise<SavedOrder | null> => {
    const d = get().draft
    if (!d) return null
    set({ busy: true, error: null })
    try {
      const saved = await saveOrder(d)
      set({ saved, draft: { ...d, serverId: saved.id }, busy: false })
      return saved
    } catch (e) {
      set({ busy: false, error: message(e) })
      return null
    }
  }
  const flag = (tableId: number, patch: LocalFlags) =>
    set((s) => ({ flags: { ...s.flags, [tableId]: { ...s.flags[tableId], ...patch } } }))

  return {
    draft: null, saved: null, openOrders: [], shift: null, flags: {}, busy: false, error: null,
    start: (sessionId, tableId, guests) => set({ draft: createDraft({ sessionId, tableId, guests }), saved: null, error: null }),
    add: (p) => update((d) => addProduct(d, p)),
    changeQty: (u, q) => update((d) => setQty(d, u, q)),
    note: (u, n) => update((d) => setNote(d, u, n)),
    remove: (u) => update((d) => removeLine(d, u)),
    save: async () => { await persist() },
    // La comanda vive en Odoo (un curso disparado); el salón la verá al refrescar. Nada local.
    sendToKitchen: async () => {
      const saved = await persist()
      if (!saved) return
      set({ busy: true })
      try { await fireUnsentLines(saved.id) } catch (e) { set({ error: message(e) }) } finally { set({ busy: false }) }
    },
    requestBill: async () => {
      const saved = await persist()
      if (saved) flag(get().draft!.tableId, { billing: true })
    },
    charge: async (paymentMethodId) => {
      const saved = await persist()
      if (!saved) return
      set({ busy: true })
      try {
        await payOrder(saved.id, paymentMethodId, saved.total)
        await closeOrder(saved.id)
        const tableId = get().draft!.tableId
        set((s) => ({ draft: null, saved: null, busy: false, flags: { ...s.flags, [tableId]: {} } }))
      } catch (e) {
        set({ busy: false, error: message(e) })
      }
    },
    // Pedido creado en otro dispositivo (o por el comensal): se cobra por su id, sin borrador local.
    chargeExisting: async (orderId, tableId, total, paymentMethodId) => {
      set({ busy: true, error: null })
      try {
        await payOrder(orderId, paymentMethodId, total)
        await closeOrder(orderId)
        set((s) => ({ busy: false, flags: { ...s.flags, [tableId]: {} } }))
      } catch (e) {
        set({ busy: false, error: message(e) })
      }
    },
    refreshOpenOrders: async (sessionId) => set({ openOrders: await listOpenOrders(sessionId) }),
    refreshShift: async (sessionId) => set({ shift: await getShiftSummary(sessionId) }),
  }
})
