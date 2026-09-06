import { ADMIN_SUBTABS, TAB_ROUTES, adminSubtabsFor, tabForPath, tabsFor } from '@/lib/domain/navigation'
import { allowedPath } from '@/lib/domain/roles'

// Falla si el mesero ve pestañas de cocina o administración, o si el cajero y el admin las pierden.
it('gives each role its tabs', () => {
  expect(tabsFor('waiter')).toEqual(['dashboard', 'orders', 'tables', 'reservations', 'history', 'inventory'])
  expect(tabsFor('cashier')).toEqual(['dashboard', 'orders', 'tables', 'reservations', 'history', 'inventory', 'kitchen', 'admin'])
  expect(tabsFor('admin')).toContain('admin')
})

// Falla si el cajero ve chips de administración que no le tocan (catálogo, configuración).
it('filters the administration row by role', () => {
  expect(adminSubtabsFor('cashier').map(([key]) => key)).toEqual(['sales', 'customers', 'billing'])
  expect(adminSubtabsFor('admin')).toHaveLength(ADMIN_SUBTABS.length)
})

// Falla si una ruta de administración deja de activar la pestaña Administración.
it('maps paths to tabs, including admin subtabs', () => {
  expect(tabForPath('/mesas/12')).toBe('tables')
  expect(tabForPath('/configuracion')).toBe('admin')
  expect(tabForPath('/pedidos')).toBe('orders')
  expect(tabForPath('/loquesea')).toBeNull()
  expect(ADMIN_SUBTABS.map(([, href]) => href)).toContain(TAB_ROUTES.admin)
})

// Falla si un mesero puede entrar a /ventas o si pierde /reservas; si el cajero pierde facturación o gana catálogo.
it('allowedPath follows the tabs and the admin row', () => {
  expect(allowedPath('waiter', '/reservas')).toBe(true)
  expect(allowedPath('waiter', '/ventas')).toBe(false)
  expect(allowedPath('cashier', '/facturacion')).toBe(true)
  expect(allowedPath('cashier', '/catalogo')).toBe(false)
  expect(allowedPath('admin', '/configuracion')).toBe(true)
  expect(allowedPath('admin', '/kit')).toBe(true)
  expect(allowedPath('cashier', '/kit')).toBe(false)
})
