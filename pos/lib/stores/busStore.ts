'use client'

import { create } from 'zustand'

import { openBus, type BusEvent, type BusHandle } from '@/lib/services/bus'

interface BusState {
  // Vivo o no. Quien sondea afloja el ritmo mientras el bus esté vivo y lo recupera si se cae.
  up: boolean
  // Un contador por tipo de aviso: sube cuando el servidor dice que algo cambió. Los efectos lo miran.
  ticks: Record<BusEvent, number>
  start: () => void
  stop: () => void
}

let handle: BusHandle | null = null

// Una sola conexión por tablet, no una por pantalla: el armazón la abre al entrar y la cierra al salir.
export const useBusStore = create<BusState>((set, get) => ({
  up: false,
  ticks: { kitchen: 0, orders: 0, notify: 0 },
  start: () => {
    if (handle) return
    handle = openBus(
      (event) => set((s) => ({ ticks: { ...s.ticks, [event]: s.ticks[event] + 1 } })),
      (up) => set({ up }),
    )
  },
  stop: () => {
    handle?.close()
    handle = null
    if (get().up) set({ up: false })
  },
}))
