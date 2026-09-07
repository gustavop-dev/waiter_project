// Centro de notificaciones del kit (Dashboard / Notification Expand.png) sobre el modelo `waiter.notification`
// de `projectapp_notify`: cocina (plato listo), inventario (stock bajo) y sistema.
export type NotificationKind = 'kitchen' | 'inventory' | 'system'
export type NotificationTab = 'all' | 'inventory' | 'kitchen'

export interface Notification {
  id: number; kind: NotificationKind; title: string; body: string
  resModel: string | null; resId: number | null; action: string | null; actionDone: boolean; read: boolean; at: string
}

export const filterByTab = (items: Notification[], tab: NotificationTab): Notification[] =>
  (tab === 'all' ? items : items.filter((n) => n.kind === tab))

export const unreadCount = (items: Notification[]): number => items.filter((n) => !n.read).length

// El generador de inventario escribe el producto en `res_id` con res_model product.product.
export const productOf = (n: Notification): number | null =>
  (n.kind === 'inventory' && n.resModel === 'product.product' && n.resId ? n.resId : null)

export const canRequest = (n: Notification): boolean => n.action === 'request_ingredient' && !n.actionDone && productOf(n) !== null
