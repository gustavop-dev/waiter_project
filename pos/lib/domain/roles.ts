import type { NavItem } from '@/components/layout/Sidebar'

// Tres roles, los del restaurante. El rol vive en Odoo (res.users.waiter_role) y ahí se sincroniza con los grupos.
export type Role = 'waiter' | 'cashier' | 'admin'
export const ROLES: Role[] = ['waiter', 'cashier', 'admin']

const NAV: Record<Role, NavItem[]> = {
  waiter: ['operation', 'customers'],
  cashier: ['operation', 'sales', 'customers', 'billing'],
  admin: ['operation', 'sales', 'catalog', 'inventory', 'customers', 'automation', 'billing', 'settings'],
}
const ROUTE_ITEM: [RegExp, NavItem][] = [
  [/^\/(salon|mesas|kds|operacion)/, 'operation'], [/^\/ventas/, 'sales'], [/^\/catalogo/, 'catalog'], [/^\/inventario/, 'inventory'],
  [/^\/clientes/, 'customers'], [/^\/automatizacion/, 'automation'], [/^\/facturacion/, 'billing'], [/^\/configuracion/, 'settings'],
]

export function navFor(role: Role): NavItem[] {
  return NAV[role]
}

export function allowedPath(role: Role, pathname: string): boolean {
  const hit = ROUTE_ITEM.find(([re]) => re.test(pathname))
  return hit ? NAV[role].includes(hit[1]) : true
}

// Acciones puntuales que no son una pantalla entera.
export const can = {
  closeRegister: (role: Role) => role !== 'waiter',
  forceCloseRegister: (role: Role) => role === 'admin',
  manageUsers: (role: Role) => role === 'admin',
}
