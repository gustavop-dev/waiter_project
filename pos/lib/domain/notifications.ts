// Centro de notificaciones del kit (Dashboard / Notification Expand.png). Hasta que exista
// `waiter.notification` en Odoo, las notificaciones se derivan de dos fuentes reales y el estado
// "leído" vive en el dispositivo (localStorage), documentado en el informe de la oleada.
export type NotificationKind = 'inventory' | 'kitchen'
export type NotificationTab = 'all' | NotificationKind

export interface LowStockRow { productId: number; name: string; qtyOnHand: number; minQty: number; requested: boolean; at: string }
export interface ReadyDish { courseId: number; dish: string; table: string; at: string }
export interface Notification { id: string; kind: NotificationKind; at: string; stock?: LowStockRow; dish?: ReadyDish }

export const stockId = (productId: number) => `stock:${productId}`
export const dishId = (courseId: number) => `dish:${courseId}`

// Más recientes primero; el id es estable para que el estado leído sobreviva a cada sondeo.
export function buildNotifications(stock: LowStockRow[], dishes: ReadyDish[]): Notification[] {
  const items: Notification[] = [
    ...stock.map((s) => ({ id: stockId(s.productId), kind: 'inventory' as const, at: s.at, stock: s })),
    ...dishes.map((d) => ({ id: dishId(d.courseId), kind: 'kitchen' as const, at: d.at, dish: d })),
  ]
  return items.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0))
}

export const filterByTab = (items: Notification[], tab: NotificationTab): Notification[] => (tab === 'all' ? items : items.filter((n) => n.kind === tab))

export const unreadCount = (items: Notification[], read: ReadelySet): number => items.filter((n) => !read.has(n.id)).length
type ReadelySet = { has: (id: string) => boolean }

export const READ_KEY = 'waiter.notifications.read'
export function readReadIds(): Set<string> {
  try { const raw = JSON.parse(localStorage.getItem(READ_KEY) || '[]'); return new Set(Array.isArray(raw) ? raw.filter((x) => typeof x === 'string') : []) } catch { return new Set() }
}
export function storeReadIds(ids: Set<string>): void {
  try { localStorage.setItem(READ_KEY, JSON.stringify([...ids])) } catch { /* sin almacenamiento */ }
}
