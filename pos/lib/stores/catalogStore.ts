'use client'

import { create } from 'zustand'

import { loadPosData } from '@/lib/services/posData'
import type { Catalog } from '@/lib/types'

interface CatalogState {
  catalog: Catalog | null
  status: 'idle' | 'loading' | 'ready' | 'error'
  load: (sessionId: number) => Promise<void>
}

export const useCatalogStore = create<CatalogState>((set) => ({
  catalog: null,
  status: 'idle',
  load: async (sessionId) => {
    set({ status: 'loading' })
    try {
      set({ catalog: await loadPosData(sessionId), status: 'ready' })
    } catch {
      set({ status: 'error' })
    }
  },
}))
