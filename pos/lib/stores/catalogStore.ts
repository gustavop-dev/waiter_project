'use client'

import { create } from 'zustand'

import { loadPosData } from '@/lib/services/posData'
import type { Catalog } from '@/lib/types'

interface CatalogState {
  catalog: Catalog | null
  status: 'idle' | 'loading' | 'ready' | 'error'
  error: string | null
  load: (sessionId: number) => Promise<void>
}

export const useCatalogStore = create<CatalogState>((set) => ({
  catalog: null,
  status: 'idle',
  error: null,
  load: async (sessionId) => {
    set({ status: 'loading', error: null })
    try {
      const catalog = await loadPosData(sessionId)
      set({ catalog, status: 'ready' })
      // El login siguiente saluda con el restaurante y la terminal, antes de tener sesión.
      try { localStorage.setItem('waiter.restaurant', catalog.company.name); localStorage.setItem('waiter.terminal', catalog.settings.configName) } catch { /* sin almacenamiento */ }
    } catch (e) {
      // El mensaje se muestra: una pantalla en blanco no dice nada a quien está en el salón.
      set({ status: 'error', error: e instanceof Error ? e.message : String(e) })
    }
  },
}))
