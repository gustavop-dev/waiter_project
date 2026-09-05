import { allowedPath, can, navFor } from '@/lib/domain/roles'

// Falla si un mesero llega a Configuración o a la caja, o si un cajero pierde Facturación.
it('limits navigation and routes by role', () => {
  expect(navFor('waiter')).toEqual(['operation', 'customers'])
  expect(allowedPath('waiter', '/configuracion')).toBe(false)
  expect(allowedPath('waiter', '/mesas/3')).toBe(true)
  expect(allowedPath('cashier', '/facturacion')).toBe(true)
  expect(allowedPath('cashier', '/catalogo')).toBe(false)
  expect(allowedPath('admin', '/configuracion')).toBe(true)
})

// Falla si un mesero puede cerrar caja o si alguien que no es administrador puede forzar un cierre.
it('reserves register closing to cashiers and forcing it to admins', () => {
  expect([can.closeRegister('waiter'), can.closeRegister('cashier'), can.forceCloseRegister('cashier'), can.forceCloseRegister('admin')]).toEqual([false, true, false, true])
})
