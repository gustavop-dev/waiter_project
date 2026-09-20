'use client'

import { create } from 'zustand'

import { addLine, replaceLine, setLineQty, type CartLine, type OptionGroup, type TaxRate } from '@/lib/domain/orderWizard'
import { depositOf, emptyDraft, type ReservationDraft, type Slot } from '@/lib/domain/reservations'
import { play } from '@/lib/audio/sounds'
import { loadMenuExtras, loadTaxes, type MenuExtras } from '@/lib/services/productOptions'
import {
  createReservation, getAvailableTables, getSlots, getTimeline, setReservationState,
  type AvailableTable, type ReservationDetail, type Timeline,
} from '@/lib/services/reservations'
import type { Catalog } from '@/lib/types'

const message = (e: unknown) => (e instanceof Error ? e.message : String(e))
export const todayIso = (): string => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

interface ReservationsState {
  date: string; floorId: number | null
  timeline: Timeline | null; loading: boolean; error: string | null
  // Wizard
  open: boolean; stepIndex: number; draft: ReservationDraft
  slots: Slot[]; tables: AvailableTable[]; lines: CartLine[]
  extras: MenuExtras | null; taxes: TaxRate[]; busy: boolean
  setDate: (date: string) => void
  setFloor: (id: number | null) => void
  load: (configId: number) => Promise<void>
  loadExtras: (catalog: Catalog) => Promise<void>
  openWizard: () => void
  closeWizard: () => void
  setDraft: (patch: Partial<ReservationDraft>) => void
  next: () => void
  back: () => void
  loadSlots: (configId: number, date: string) => Promise<void>
  loadTables: (configId: number) => Promise<void>
  add: (line: CartLine) => void
  setQty: (uuid: string, qty: number) => void
  update: (uuid: string, patch: Pick<CartLine, 'qty' | 'note' | 'options'>) => void
  clear: () => void
  create: (configId: number) => Promise<ReservationDetail | null>
  changeState: (id: number, state: 'seated' | 'no_show' | 'cancelled', configId: number) => Promise<void>
}

// Reservas del kit (7 – Reservation): la grilla del día y el asistente de cuatro pasos. El servidor
// (`projectapp_reservations`) decide franjas, mesas libres y solapes; aquí solo se orquesta la pantalla.
export const useReservationsStore = create<ReservationsState>((set, get) => ({
  date: todayIso(), floorId: null, timeline: null, loading: false, error: null,
  open: false, stepIndex: 0, draft: emptyDraft(), slots: [], tables: [], lines: [], extras: null, taxes: [], busy: false,

  setDate: (date) => set({ date }),
  setFloor: (floorId) => set({ floorId }),
  load: async (configId) => {
    set({ loading: true, error: null })
    try {
      const timeline = await getTimeline(configId, get().date, get().floorId)
      // Sin piso elegido, la grilla muestra el primero: el kit siempre tiene uno activo.
      set({ timeline, loading: false, floorId: get().floorId ?? timeline.floors[0]?.id ?? null })
    } catch (e) { set({ loading: false, error: message(e) }) }
  },
  loadExtras: async (catalog) => {
    try {
      const [extras, taxes] = await Promise.all([
        loadMenuExtras([...new Set(catalog.products.map((p) => p.templateId))] as number[]),
        loadTaxes([...new Set(catalog.products.flatMap((p) => p.taxIds))] as number[]),
      ])
      set({ extras, taxes })
    } catch (e) { set({ error: message(e) }) }
  },

  openWizard: () => set({ open: true, stepIndex: 0, draft: { ...emptyDraft(), date: get().date }, lines: [], tables: [] }),
  closeWizard: () => set({ open: false }),
  setDraft: (patch) => set((s) => ({ draft: { ...s.draft, ...patch } })),
  next: () => set((s) => ({ stepIndex: Math.min(s.stepIndex + 1, 3) })),
  back: () => set((s) => ({ stepIndex: Math.max(0, s.stepIndex - 1) })),

  loadSlots: async (configId, date) => {
    try { set({ slots: await getSlots(configId, date) }) } catch (e) { set({ error: message(e) }) }
  },
  loadTables: async (configId) => {
    const { draft } = get()
    if (!draft.date || draft.timeStart === null) return
    set({ busy: true })
    try { set({ tables: await getAvailableTables(configId, draft.date, draft.timeStart, draft.people, draft.prepMinutes), busy: false }) }
    catch (e) { set({ busy: false, error: message(e) }) }
  },

  add: (line) => { play('tap'); set((s) => ({ lines: addLine(s.lines, line) })) },
  setQty: (uuid, qty) => set((s) => ({ lines: setLineQty(s.lines, uuid, qty) })),
  update: (uuid, patch) => set((s) => ({ lines: replaceLine(s.lines, uuid, patch) })),
  clear: () => set({ lines: [] }),

  create: async (configId) => {
    const { draft, lines } = get()
    if (!draft.date || draft.timeStart === null || draft.tableIds.length === 0) return null
    set({ busy: true, error: null })
    try {
      const created = await createReservation({
        customerName: draft.customerName.trim(), customerEmail: draft.customerEmail.trim(), customerPhone: draft.customerPhone.trim(),
        people: draft.people, babyChair: draft.babyChair, notes: draft.notes.trim(),
        date: draft.date, timeStart: draft.timeStart, tableIds: draft.tableIds, configId, prepMinutes: draft.prepMinutes, depositAmount: depositOf(draft),
      }, lines.map((l) => ({ productId: l.productId, qty: l.qty, note: l.note })))
      set({ busy: false, open: false, date: draft.date })
      await get().load(configId)
      return created
    } catch (e) {
      play('error')
      set({ busy: false, error: message(e) })
      return null
    }
  },
  changeState: async (id, state, configId) => {
    try { await setReservationState(id, state); await get().load(configId) }
    catch (e) { set({ error: message(e) }) }
  },
}))
