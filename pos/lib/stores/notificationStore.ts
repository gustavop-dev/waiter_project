'use client'

import { create } from 'zustand'

import { buildNotifications, readReadIds, storeReadIds, unreadCount, type Notification } from '@/lib/domain/notifications'
import { listLowStock, listReadyDishes } from '@/lib/services/notifications'

interface NotificationState {
  items: Notification[]
  read: Set<string>
  refresh: (sessionId: number | null) => Promise<void>
  markAllRead: () => void
  setRequested: (productId: number) => void
  unread: () => number
}

// Estado leído en el dispositivo (localStorage) hasta que exista `waiter.notification` en Odoo.
export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],
  read: readReadIds(),
  refresh: async (sessionId) => {
    const [stock, dishes] = await Promise.all([
      listLowStock().catch(() => []),
      sessionId ? listReadyDishes(sessionId).catch(() => []) : Promise.resolve([]),
    ])
    set({ items: buildNotifications(stock, dishes) })
  },
  markAllRead: () => {
    const read = new Set([...get().read, ...get().items.map((n) => n.id)])
    storeReadIds(read)
    set({ read })
  },
  setRequested: (productId) => set({ items: get().items.map((n) => (n.stock?.productId === productId ? { ...n, stock: { ...n.stock, requested: true } } : n)) }),
  unread: () => unreadCount(get().items, get().read),
}))
