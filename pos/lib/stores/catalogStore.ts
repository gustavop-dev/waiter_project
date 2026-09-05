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
      const catalog = await loadPosData(sessionId)
      set({ catalog, status: 'ready' })
      // El login siguiente saluda con el restaurante y la terminal, antes de tener sesión.
      try { localStorage.setItem('waiter.restaurant', catalog.company.name); localStorage.setItem('waiter.terminal', catalog.settings.configName) } catch { /* sin almacenamiento */ }
    } catch {
      set({ status: 'error' })
    }
  },
}))
