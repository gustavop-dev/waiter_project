import { buildNotifications, filterByTab, readReadIds, storeReadIds, unreadCount } from '@/lib/domain/notifications'

const stock = [{ productId: 7, name: 'Salmón', qtyOnHand: 1, minQty: 5, requested: false, at: '2026-09-06 10:00:00' }]
const dishes = [{ courseId: 3, dish: 'Pollo a la mantequilla', table: 'A8', at: '2026-09-06 11:00:00' }, { courseId: 4, dish: 'Pasta', table: 'B12', at: '2026-09-06 09:00:00' }]

beforeEach(() => localStorage.clear())

// Falla si las notificaciones pierden el orden por fecha (recientes primero) o el id estable por origen.
it('builds a single list, newest first, with stable ids', () => {
  const items = buildNotifications(stock, dishes)
  expect(items.map((n) => n.id)).toEqual(['dish:3', 'stock:7', 'dish:4'])
  expect(items[1].stock?.name).toBe('Salmón')
})

// Falla si la pestaña Inventario o Cocina deja pasar notificaciones del otro tipo.
it('filters by tab and counts unread against the stored read set', () => {
  const items = buildNotifications(stock, dishes)
  expect(filterByTab(items, 'inventory')).toHaveLength(1)
  expect(filterByTab(items, 'kitchen')).toHaveLength(2)
  expect(filterByTab(items, 'all')).toHaveLength(3)
  storeReadIds(new Set(['dish:3']))
  expect(unreadCount(items, readReadIds())).toBe(2)
})

// Falla si un valor corrupto en localStorage rompe la lectura del estado leído.
it('ignores a corrupt read set in localStorage', () => {
  localStorage.setItem('waiter.notifications.read', '{oops')
  expect(readReadIds().size).toBe(0)
})
