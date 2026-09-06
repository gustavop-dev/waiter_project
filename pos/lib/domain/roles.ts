import type { NavItem } from '@/components/layout/Sidebar'
import { pathAllowed } from '@/lib/domain/navigation'

// Tres roles, los del restaurante. El rol vive en Odoo (res.users.waiter_role) y ahí se sincroniza con los grupos.
export type Role = 'waiter' | 'cashier' | 'admin'
export const ROLES: Role[] = ['waiter', 'cashier', 'admin']

const NAV: Record<Role, NavItem[]> = {
  waiter: ['operation', 'customers'],
  cashier: ['operation', 'sales', 'customers', 'billing'],
  admin: ['operation', 'sales', 'catalog', 'inventory', 'customers', 'automation', 'billing', 'settings'],
}
export function navFor(role: Role): NavItem[] {
  return NAV[role]
}

// Desde la oleada I.1 la guarda sigue a las pestañas del kit (lib/domain/navigation.ts).
export function allowedPath(role: Role, pathname: string): boolean {
  return pathAllowed(role, pathname)
}

// Acciones puntuales que no son una pantalla entera.
export const can = {
  closeRegister: (role: Role) => role !== 'waiter',
  forceCloseRegister: (role: Role) => role === 'admin',
  manageUsers: (role: Role) => role === 'admin',
}
