'use client'

import { create } from 'zustand'

import { DEFAULT_TEMPLATE, applyPreview, parsePreview, templateFromSpec } from '@/lib/domain/template'
import { ApiError, addLine, callWaiter, confirmOrder, getAccount, getCart, getEntry, getOrder, getTemplates, logoutAccount, openSession, registerAccount, removeLine, requestBill, simulatePayment, updateLine, verifyAccount } from '@/lib/services/api'
import type { Account, AccountOrder, Bill, Cart, Entry, OrderStatus, PayMethod, PayResult, PayState, RegisterForm, Session, Template } from '@/lib/types'

interface Keys { rest: string; venue: string; token: string | null }
// Registro pendiente de verificar: el id que devolvió experience y el formulario, por si hay que reenviar el código.
interface PendingAccount { id: string; form: RegisterForm }
// Tiempo mínimo en «Autorizando»: el comensal debe ver que algo pasa antes del resultado (el endpoint simulado responde al instante).
export const AUTHORIZING_MS = 1_200

interface DinerState {
  keys: Keys | null
  entry: Entry | null
  session: Session | null
  cart: Cart | null
  order: OrderStatus | null
  bill: Bill | null
  error: string | null
  busy: boolean
  // Plantilla que pinta el motor: vista previa (?vista_previa=) > contexto de la sede > B1 embebida.
  template: Template
  preview: Template | null
  // Cuenta del comensal (maquetada con datos reales).
  account: Account | null
  accountOrders: AccountOrder[]
  pendingAccount: PendingAccount | null
  // Pago maquetado.
  payState: PayState
  payResult: PayResult | null
  load: (keys: Keys) => Promise<void>
  applyPreviewParam: (raw: string | null | undefined) => Promise<void>
  ensureSession: () => Promise<Session | null>
  refreshCart: () => Promise<void>
  add: (productId: number, qty: number, note: string) => Promise<void>
  setQty: (lineId: number, qty: number) => Promise<void>
  remove: (lineId: number) => Promise<void>
  confirm: () => Promise<string | null>
  refreshOrder: (orderId: string) => Promise<void>
  call: () => Promise<boolean>
  askBill: () => Promise<Bill | null>
  register: (form: RegisterForm) => Promise<string | null>
  resendCode: () => Promise<boolean>
  verify: (code: string) => Promise<boolean>
  loadAccount: () => Promise<void>
  logout: () => Promise<void>
  simulatePay: (metodo: PayMethod) => Promise<PayResult | null>
  resetPay: () => void
}

const message = (e: unknown) => (e instanceof ApiError ? e.message : e instanceof Error ? e.message : String(e))
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
// Monto a pagar desde el celular: la cuenta si ya se pidió, si no el pedido confirmado, si no lo que hay en el carrito.
export const payableTotal = (s: Pick<DinerState, 'bill' | 'order' | 'cart'>) => s.bill?.total ?? s.order?.total ?? s.cart?.total ?? 0
const resolveTemplate = (preview: Template | null, entry: Entry | null) => preview ?? entry?.contexto.plantilla ?? DEFAULT_TEMPLATE

export const useDinerStore = create<DinerState>((set, get) => {
  const run = async <T,>(fn: () => Promise<T>): Promise<T | null> => {
    set({ busy: true, error: null })
    try { return await fn() } catch (e) { set({ error: message(e) }); return null } finally { set({ busy: false }) }
  }
  return {
    keys: null, entry: null, session: null, cart: null, order: null, bill: null, error: null, busy: false,
    template: DEFAULT_TEMPLATE, preview: null,
    account: null, accountOrders: [], pendingAccount: null,
    payState: 'idle', payResult: null,
    // Entrada: contexto + carta (+ plantilla resuelta). La sesión (cookie del comensal) se abre al primer gesto que la necesite.
    load: async (keys) => {
      const same = get().keys && JSON.stringify(get().keys) === JSON.stringify(keys)
      if (!same) set({ keys, entry: null, session: null, cart: null, order: null, bill: null })
      await run(async () => { const entry = await getEntry(keys.rest, keys.venue, keys.token); set({ entry, template: resolveTemplate(get().preview, entry) }) })
    },
    // Vista previa sin guardar (la usa el POS por iframe): parte de los tokens del catálogo para el código pedido, no de los de la sede.
    // Si el catálogo no responde, se previsualiza sobre la plantilla actual; sin parámetro se vuelve a lo guardado.
    applyPreviewParam: async (raw) => {
      const payload = parsePreview(raw)
      if (!payload) { if (get().preview) set({ preview: null, template: resolveTemplate(null, get().entry) }); return }
      const current = get().entry?.contexto.plantilla ?? DEFAULT_TEMPLATE
      let base = current
      if (payload.plantilla) {
        try {
          const spec = (await getTemplates()).plantillas.find((s) => s.codigo === payload.plantilla)
          if (spec) base = templateFromSpec(spec, current.descuento)
        } catch { /* sin catálogo: se previsualiza sobre la plantilla actual */ }
      }
      const preview = applyPreview(base, payload)
      set({ preview, template: preview })
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
    // Idempotente en el servidor: tocar dos veces devuelve el mismo pedido. Si el restaurante no responde (experience
    // devuelve el pedido como fallido), el carrito sigue ahí.
    confirm: async () => {
      const { session, keys } = get()
      if (!session || !keys) return null
      return run(async () => {
        try {
          const r = await confirmOrder(session.id)
          const order = await getOrder(r.pedido)
          set({ order, cart: await getCart(session.id) })
          return r.pedido
        } catch (e) {
          // 409: el salón ya cobró la cuenta de esta visita. La sesión terminó; se abre otra limpia y se avisa.
          if (e instanceof ApiError && e.status === 409) {
            const r = await openSession(keys.rest, keys.venue, keys.token)
            set({ session: r.sesion, cart: await getCart(r.sesion.id), order: null, bill: null })
          }
          throw e
        }
      })
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
    // Cuenta: dos campos, sin contraseña. El registro crea la cuenta pendiente; el código la verifica y la liga a la cookie.
    register: async (form) => {
      return run(async () => { const r = await registerAccount(form); set({ pendingAccount: { id: r.id, form } }); return r.id })
    },
    resendCode: async () => {
      const pending = get().pendingAccount
      if (!pending) return false
      const ok = await run(async () => { const r = await registerAccount(pending.form); set({ pendingAccount: { id: r.id, form: pending.form } }); return true })
      return ok ?? false
    },
    verify: async (code) => {
      const pending = get().pendingAccount
      if (!pending) return false
      const ok = await run(async () => {
        const r = await verifyAccount(pending.id, code)
        const account: Account = r.cuenta ?? { id: pending.id, nombre: pending.form.nombre, correo: pending.form.correo, celular: pending.form.celular, verificada: true }
        set({ account, pendingAccount: null })
        return true
      })
      if (ok) await get().loadAccount()
      return ok ?? false
    },
    // Sin cuenta ligada a esta cookie, experience responde 401/404: no es un error que mostrar.
    loadAccount: async () => {
      await run(async () => {
        try {
          const r = await getAccount()
          set({ account: r.cuenta, accountOrders: r.pedidos ?? [] })
        } catch (e) {
          if (e instanceof ApiError && (e.status === 401 || e.status === 403 || e.status === 404)) { set({ account: null, accountOrders: [] }); return }
          throw e
        }
      })
    },
    logout: async () => {
      await run(async () => { await logoutAccount(); set({ account: null, accountOrders: [], pendingAccount: null }) })
    },
    // Pago maquetado: «Autorizando» al menos AUTHORIZING_MS, luego pagado o rechazado. Nunca sale el número de la tarjeta de aquí.
    simulatePay: async (metodo) => {
      const session = await get().ensureSession()
      if (!session) return null
      const monto = payableTotal(get())
      set({ payState: 'authorizing', payResult: null, error: null })
      try {
        const [result] = await Promise.all([simulatePayment(session.id, metodo, monto), sleep(AUTHORIZING_MS)])
        const payResult: PayResult = { ...result, metodo, monto }
        set({ payState: payResult.estado === 'aprobado' ? 'paid' : 'declined', payResult })
        return payResult
      } catch (e) {
        set({ payState: 'declined', payResult: null, error: message(e) })
        return null
      }
    },
    resetPay: () => set({ payState: 'idle', payResult: null }),
  }
})
