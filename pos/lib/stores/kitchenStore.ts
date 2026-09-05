'use client'

import { create } from 'zustand'

import { chime } from '@/lib/audio/chime'
import { ALL } from '@/lib/domain/kitchen'
import { listCompletedCourses, listKitchenTickets, markReady, markServed, type CompletedCourse, type KitchenTicket } from '@/lib/services/kitchen'

type StationOf = (productId: number) => string | null

interface KitchenState {
  tickets: KitchenTicket[]
  done: CompletedCourse[]
  tab: string
  muted: boolean
  primed: boolean
  error: string | null
  refresh: (sessionId: number, stationOf: StationOf) => Promise<void>
  ready: (courseId: number, sessionId: number, stationOf: StationOf) => Promise<void>
  serve: (courseId: number, sessionId: number, stationOf: StationOf) => Promise<void>
  setTab: (tab: string) => void
  toggleMute: () => void
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e))

export const useKitchenStore = create<KitchenState>((set, get) => ({
  tickets: [], done: [], tab: ALL, muted: false, primed: false, error: null,
  refresh: async (sessionId, stationOf) => {
    try {
      const [tickets, done] = await Promise.all([listKitchenTickets(sessionId, stationOf), listCompletedCourses(sessionId)])
      const known = new Set(get().tickets.map((t) => t.id))
      // Suena solo cuando entra algo nuevo después de la primera carga (no al abrir la pantalla).
      if (get().primed && !get().muted && tickets.some((t) => !known.has(t.id))) chime()
      set({ tickets, done, primed: true, error: null })
    } catch (e) {
      set({ error: message(e) })
    }
  },
  ready: async (courseId, sessionId, stationOf) => {
    await markReady(courseId)
    await get().refresh(sessionId, stationOf)
  },
  serve: async (courseId, sessionId, stationOf) => {
    await markServed(courseId)
    await get().refresh(sessionId, stationOf)
  },
  setTab: (tab) => set({ tab }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),
}))
