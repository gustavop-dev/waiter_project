'use client'

import { create } from 'zustand'

import { addProduct, createDraft, removeLine, setNote, setOrderNote, setQty } from '@/lib/domain/order'
import type { DraftOrder } from '@/lib/domain/order'
import type { LocalFlags } from '@/lib/domain/tableState'
import { play } from '@/lib/audio/sounds'
import { change, type SettlePlan } from '@/lib/domain/payment'
import { fireUnsentLines } from '@/lib/services/kitchen'
import { useOpsStore } from '@/lib/stores/opsStore'
import { addTip, closeOrder, setChange, getShiftSummary, listOpenOrders, payOrder, saveOrder } from '@/lib/services/orders'
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
  orderNote: (note: string) => void
  remove: (lineUuid: string) => void
  save: () => Promise<void>
  sendToKitchen: () => Promise<void>
  requestBill: () => Promise<void>
  charge: (paymentMethodId: number) => Promise<void>
  chargeExisting: (orderId: number, tableId: number, total: number, paymentMethodId: number) => Promise<void>
  receipt: ReceiptData | null
  settle: (plan: SettlePlan, ctx: SettleContext) => Promise<boolean>
  closeReceipt: () => void
  refreshOpenOrders: (sessionId: number) => Promise<void>
  refreshShift: (sessionId: number) => Promise<void>
}

export interface ReceiptData {
  company: string; tableNumber: number; reference: string; at: number; lines: { uuid: string; name: string; qty: number; unitPrice: number }[]
  subtotal: number; tax: number; tip: number; total: number; payments: { method: string; amount: number; reference: string }[]; change: number
}
// Lo que el cobro necesita saber además del plan: dónde está el pedido y con qué pintar el recibo.
export interface SettleContext {
  existing: { orderId: number; tableId: number } | null; tipProductId: number | null; tableNumber: number; company: string
  lines: ReceiptData['lines']; methodName: (id: number) => string
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
      play('error')
      set({ busy: false, error: message(e) })
      return null
    }
  }
  const flag = (tableId: number, patch: LocalFlags) =>
    set((s) => ({ flags: { ...s.flags, [tableId]: { ...s.flags[tableId], ...patch } } }))

  return {
    draft: null, saved: null, openOrders: [], shift: null, flags: {}, busy: false, error: null, receipt: null,
    start: (sessionId, tableId, guests) => set({ draft: createDraft({ sessionId, tableId, guests }), saved: null, error: null }),
    add: (p) => { play('tap'); update((d) => addProduct(d, p)) },
    changeQty: (u, q) => update((d) => setQty(d, u, q)),
    note: (u, n) => update((d) => setNote(d, u, n)),
    orderNote: (n) => update((d) => setOrderNote(d, n)),
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
      if (saved) { flag(get().draft!.tableId, { billing: true }); useOpsStore.getState().markBilling(get().draft!.tableId, Date.now()) }
    },
    charge: async (paymentMethodId) => {
      const saved = await persist()
      if (!saved) return
      set({ busy: true })
      try {
        await payOrder(saved.id, paymentMethodId, saved.total)
        await closeOrder(saved.id)
        play('cobro')
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
        play('cobro')
        set((s) => ({ busy: false, flags: { ...s.flags, [tableId]: {} } }))
      } catch (e) {
        set({ busy: false, error: message(e) })
      }
    },
    // Cobro completo: propina (línea en Odoo), un add_payment por pago, cambio en amount_return, cierre y recibo.
    settle: async (plan, ctx) => {
      let orderId = ctx.existing?.orderId ?? null
      let tableId = ctx.existing?.tableId ?? null
      if (orderId === null) {
        const saved = await persist()
        if (!saved) return false
        orderId = saved.id
        tableId = get().draft!.tableId
      }
      set({ busy: true, error: null })
      try {
        if (plan.tip > 0 && ctx.tipProductId) await addTip(orderId, ctx.tipProductId, plan.tip)
        for (const p of plan.payments) await payOrder(orderId, p.methodId, p.amount)
        const ch = change(plan.payments)
        if (ch > 0) await setChange(orderId, ch)
        const closed = await closeOrder(orderId)
        play('cobro')
        const receipt: ReceiptData = { company: ctx.company, tableNumber: ctx.tableNumber, reference: closed.reference, at: Date.now(), lines: ctx.lines,
          subtotal: closed.total - closed.tax - plan.tip, tax: closed.tax, tip: plan.tip, total: closed.total,
          payments: plan.payments.map((p) => ({ method: ctx.methodName(p.methodId), amount: p.amount, reference: p.reference })), change: ch }
        set((s) => ({ draft: null, saved: null, busy: false, receipt, flags: { ...s.flags, [tableId!]: {} } }))
        return true
      } catch (e) {
        play('error')
        set({ busy: false, error: message(e) })
        return false
      }
    },
    closeReceipt: () => set({ receipt: null }),
    refreshOpenOrders: async (sessionId) => set({ openOrders: await listOpenOrders(sessionId) }),
    refreshShift: async (sessionId) => set({ shift: await getShiftSummary(sessionId) }),
  }
})
