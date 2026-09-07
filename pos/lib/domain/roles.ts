import { pathAllowed } from '@/lib/domain/navigation'

// Módulos del POS anteriores al kit; siguen nombrando las pantallas de administración (Shell y navFor).
export const NAV_ITEMS = ['operation', 'sales', 'catalog', 'inventory', 'customers', 'automation', 'billing', 'settings'] as const
export type NavItem = (typeof NAV_ITEMS)[number]

// Tres roles, los del restaurante. El rol vive en Odoo (res.users.waiter_role) y ahí se sincroniza con los grupos.
export type Role = 'waiter' | 'cashier' | 'admin'
export const ROLES: Role[] = ['waiter', 'cashier', 'admin']

// Quién manda en la pantalla: el empleado que inició turno, nunca la credencial del terminal. Si la tablet
// entró como administrador y luego marca su PIN un mesero, la pantalla es la del mesero. Y al revés, un
// empleado tampoco gana permisos que su terminal no tiene: se aplica el menor de los dos.
export function effectiveRole(userRole: Role | null | undefined, employeeRole: Role | null | undefined): Role {
  const user = userRole ?? 'waiter'
  if (!employeeRole) return user
  return ROLES.indexOf(employeeRole) < ROLES.indexOf(user) ? employeeRole : user
}

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
