'use client'

import { create } from 'zustand'

import { productOf, unreadCount, type Notification } from '@/lib/domain/notifications'
import { listNotifications, markAllRead as markAllReadRequest, markRead } from '@/lib/services/notifications'

interface NotificationState {
  items: Notification[]
  refresh: () => Promise<void>
  markAllRead: () => Promise<void>
  markRead: (ids: number[]) => Promise<void>
  setActionDone: (productId: number) => void
  unread: () => number
}

// Todo el estado vive en Odoo (`waiter.notification`): leído y "ya solicitado" son campos del modelo.
export const useNotificationStore = create<NotificationState>((set, get) => ({
  items: [],
  refresh: async () => set({ items: await listNotifications().catch(() => get().items) }),
  markAllRead: async () => {
    set({ items: get().items.map((n) => ({ ...n, read: true })) })
    await markAllReadRequest().catch(() => undefined)
  },
  markRead: async (ids) => {
    set({ items: get().items.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)) })
    await markRead(ids).catch(() => undefined)
  },
  // El servidor cierra todas las de inventario del producto: aquí se refleja lo mismo sin esperar al sondeo.
  setActionDone: (productId) => set({ items: get().items.map((n) => (productOf(n) === productId ? { ...n, actionDone: true } : n)) }),
  unread: () => unreadCount(get().items),
}))
