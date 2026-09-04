'use client'

import { create } from 'zustand'

interface FloorState {
  activeFloorId: number | null
  selectedTableId: number | null
  setFloor: (id: number) => void
  selectTable: (id: number | null) => void
}

export const useFloorStore = create<FloorState>((set) => ({
  activeFloorId: null,
  selectedTableId: null,
  setFloor: (id) => set({ activeFloorId: id, selectedTableId: null }),
  selectTable: (id) => set({ selectedTableId: id }),
}))
