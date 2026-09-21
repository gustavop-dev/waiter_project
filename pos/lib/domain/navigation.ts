import type { Role } from '@/lib/domain/roles'

// Pestañas de la barra superior del kit CloudPos. Las seis primeras son las del mesero, tal cual el kit;
// Cocina y Administración usan el mismo componente "Navigation Item" y aparecen según el rol.
export const KIT_TABS = ['dashboard', 'orders', 'tables', 'reservations', 'history', 'inventory', 'kitchen', 'admin'] as const
export type KitTab = (typeof KIT_TABS)[number]

export const TAB_ROUTES: Record<KitTab, string> = {
  dashboard: '/dashboard', orders: '/pedidos', tables: '/salon', reservations: '/reservas', history: '/historial',
  inventory: '/inventario', kitchen: '/kds', admin: '/ventas',
}

// Segunda fila de Administración (chips "Tab Menu" del kit). Caja vive en Ventas hasta la oleada I.7. El Catálogo dejó de
// ser una pestaña: repetía la lista de platos de Inventario, y la ficha comercial del plato ahora se edita allí.
export const ADMIN_SUBTABS = [['sales', '/ventas'], ['customers', '/clientes'], ['billing', '/facturacion'], ['roi', '/automatizacion'], ['settings', '/configuracion']] as const
export type AdminSubtab = (typeof ADMIN_SUBTABS)[number][0]

const WAITER: KitTab[] = ['dashboard', 'orders', 'tables', 'reservations', 'history', 'inventory']
const BY_ROLE: Record<Role, KitTab[]> = { waiter: WAITER, cashier: [...WAITER, 'kitchen', 'admin'], admin: [...WAITER, 'kitchen', 'admin'] }
const SUBTABS_BY_ROLE: Record<Role, AdminSubtab[]> = { waiter: [], cashier: ['sales', 'customers', 'billing'], admin: ['sales', 'customers', 'billing', 'roi', 'settings'] }

export const tabsFor = (role: Role): KitTab[] => BY_ROLE[role]
export const adminSubtabsFor = (role: Role) => ADMIN_SUBTABS.filter(([key]) => SUBTABS_BY_ROLE[role].includes(key))

const PATH_TAB: [RegExp, KitTab][] = [
  [/^\/dashboard/, 'dashboard'], [/^\/(pedidos|operacion)/, 'orders'], [/^\/(salon|mesas)/, 'tables'], [/^\/reservas/, 'reservations'],
  [/^\/historial/, 'history'], [/^\/inventario/, 'inventory'], [/^\/kds/, 'kitchen'],
  [/^\/(ventas|catalogo|clientes|facturacion|automatizacion|configuracion|kit)/, 'admin'],
]
export const tabForPath = (pathname: string): KitTab | null => PATH_TAB.find(([re]) => re.test(pathname))?.[1] ?? null
export const adminSubtabForPath = (pathname: string): AdminSubtab | null => ADMIN_SUBTABS.find(([, href]) => pathname.startsWith(href))?.[0] ?? null

// Una ruta se permite si su pestaña es del rol y, dentro de Administración, si su chip también lo es. Rutas sin pestaña (galería, etc.) pasan.
export function pathAllowed(role: Role, pathname: string): boolean {
  const tab = tabForPath(pathname)
  if (!tab) return true
  if (!BY_ROLE[role].includes(tab)) return false
  if (tab !== 'admin') return true
  const sub = adminSubtabForPath(pathname)
  return sub ? SUBTABS_BY_ROLE[role].includes(sub) : role === 'admin'
}

// Las operaciones de pedidos y cocina requieren caja; la configuración del restaurante no.
// Pantalla de inicio de cada rol, al marcar el PIN y al abrir la app. El administrador va a Inicio: su trabajo es la
// visión general, no las mesas, y la ve con la caja abierta o cerrada. Meseros y cajeros van a Mesas si hay caja abierta
// y, si no, a abrirla.
export function homePath(role: Role, hasOpenSession: boolean): string {
  if (role === 'admin') return '/dashboard'
  return hasOpenSession ? '/salon' : '/caja'
}

export function administrationPath(pathname: string): boolean {
  return /^\/(dashboard|salon|inventario|reservas|historial|ventas|catalogo|clientes|facturacion|automatizacion|configuracion|kit)(\/|$)/.test(pathname)
}
