// Estados del pedido en el lenguaje del kit CloudPos (Plan I, "Estados del pedido").
// Todo se deriva de lo que ya vive en Odoo: el preset (tipo), los cursos (`fired`, `ready_date`, `served_date`),
// `pos.order.state` y la bandera local `billing` del orderStore. Nada se inventa ni se persiste aparte.

export type OrderType = 'dine_in' | 'takeout' | 'delivery'
export type ServiceAt = 'table' | 'counter' | 'delivery'
export type KitStatus = 'in_progress' | 'ready' | 'served' | 'waiting_payment' | 'completed'
export type LineGroup = 'waiting' | 'in_progress' | 'served'
export type OrdersFilter = 'all' | KitStatus
export type OrdersSort = 'latest' | 'oldest' | 'type'
export type HistoryFilter = 'all' | OrderType

export interface KitCourse { id: number; fired: boolean; readyAt: string | null; servedAt: string | null }
export interface KitLine {
  id: number; uuid: string; productId: number; name: string; qty: number; unitPrice: number; subtotal: number; total: number; note: string
  courseId: number | null; servedAt: string | null
}
export interface KitOrder {
  id: number; number: string; type: OrderType; state: 'draft' | 'paid' | 'done' | 'invoiced' | 'cancel'
  tableId: number | null; tableNumber: number | null; customer: string; startedAt: string; total: number; tax: number
  lines: KitLine[]; courses: KitCourse[]
}

const PREFIX: Record<OrderType, string> = { dine_in: 'DI', takeout: 'TA', delivery: 'DE' }
const PAID = new Set(['paid', 'done', 'invoiced'])
const STATUS_ORDER: KitStatus[] = ['in_progress', 'ready', 'served', 'waiting_payment', 'completed']

// El tipo sale del preset de Odoo (Dine In `table`, Takeout `counter`, Delivery `delivery`).
// Sin preset (pedidos anteriores a la oleada), una mesa significa "en mesa" y sin mesa "para llevar".
export function orderTypeOf(serviceAt: ServiceAt | null, hasTable: boolean): OrderType {
  if (serviceAt === 'counter') return 'takeout'
  if (serviceAt === 'delivery') return 'delivery'
  if (serviceAt === 'table') return 'dine_in'
  return hasTable ? 'dine_in' : 'takeout'
}

// "DI001": prefijo por tipo + número de pedido de Odoo (tracking_number) a tres cifras.
export function orderNumber(type: OrderType, tracking: string | number): string {
  const digits = String(tracking).replace(/\D/g, '') || '0'
  return `${PREFIX[type]}${digits.padStart(3, '0')}`
}

// El nombre libre del pedido manda; si no lo hay, el cliente de Odoo; si no, vacío (la tarjeta lo muestra como "—").
export function customerName(floatingName: string | false | null, partner: [number, string] | false | null): string {
  return (floatingName || '').trim() || (partner ? partner[1] : '')
}

const courseOf = (order: KitOrder, line: KitLine) => order.courses.find((c) => c.id === line.courseId)

// Esperando cocina: sin curso o curso sin disparar. En progreso: disparado y no servido. Servido: curso con served_date.
export function lineGroup(order: KitOrder, line: KitLine): LineGroup {
  const course = courseOf(order, line)
  if (!course || !course.fired) return 'waiting'
  // La línea manda: el mesero sirve plato a plato y el curso se cierra cuando ya no queda ninguno pendiente.
  return line.servedAt || course.servedAt ? 'served' : 'in_progress'
}

// % = líneas servidas / líneas enviadas a cocina. Sin nada enviado, 0.
export function progressPercent(order: KitOrder): number {
  const sent = order.lines.filter((l) => lineGroup(order, l) !== 'waiting')
  if (sent.length === 0) return 0
  return Math.round((sent.filter((l) => lineGroup(order, l) === 'served').length / sent.length) * 100)
}

export function orderStatus(order: KitOrder, billing: boolean): KitStatus {
  if (PAID.has(order.state)) return 'completed'
  if (billing) return 'waiting_payment'
  const groups = order.lines.map((l) => lineGroup(order, l))
  if (groups.length > 0 && groups.every((g) => g === 'served')) return 'served'
  const fired = order.courses.filter((c) => c.fired)
  if (fired.length > 0 && fired.every((c) => c.readyAt !== null) && !groups.includes('waiting') && fired.some((c) => c.servedAt === null)) return 'ready'
  return 'in_progress'
}

// Cobrar exige que todo lo pedido esté servido (el kit deshabilita "Pay Bills" mientras haya casillas sin marcar).
export function canCharge(order: KitOrder): boolean {
  return order.lines.length > 0 && order.lines.every((l) => lineGroup(order, l) === 'served')
}

// Búsqueda por número de pedido ("DI104", "104", "#104") o por nombre de cliente.
export function matchesOrderSearch(order: KitOrder, query: string): boolean {
  const q = query.trim().replace(/^#/, '').toLowerCase()
  if (!q) return true
  return order.number.toLowerCase().includes(q) || order.customer.toLowerCase().includes(q) || String(order.id) === q
}

export function filterOrders(orders: KitOrder[], filter: OrdersFilter, statusOf: (o: KitOrder) => KitStatus): KitOrder[] {
  return filter === 'all' ? orders : orders.filter((o) => statusOf(o) === filter)
}

export function countByStatus(orders: KitOrder[], statusOf: (o: KitOrder) => KitStatus): Record<OrdersFilter, number> {
  const counts = { all: orders.length, in_progress: 0, ready: 0, served: 0, waiting_payment: 0, completed: 0 }
  orders.forEach((o) => { counts[statusOf(o)] += 1 })
  return counts
}

const TYPE_ORDER: OrderType[] = ['dine_in', 'takeout', 'delivery']
export function sortOrders(orders: KitOrder[], sort: OrdersSort): KitOrder[] {
  const byDate = (a: KitOrder, b: KitOrder) => b.startedAt.localeCompare(a.startedAt) || b.id - a.id
  if (sort === 'latest') return [...orders].sort(byDate)
  if (sort === 'oldest') return [...orders].sort((a, b) => -byDate(a, b))
  return [...orders].sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || byDate(a, b))
}

export function filterHistory(orders: KitOrder[], filter: HistoryFilter): KitOrder[] {
  return filter === 'all' ? orders : orders.filter((o) => o.type === filter)
}

export const statusRank = (s: KitStatus) => STATUS_ORDER.indexOf(s)

// Odoo guarda date_order en UTC sin zona ("2026-09-06 23:33:51").
export function odooDate(at: string): Date {
  return new Date(at.replace(' ', 'T') + 'Z')
}

// Saludo por hora local: mañana hasta las 12, tarde hasta las 19, noche después.
export function greetingFor(hour: number): 'morning' | 'afternoon' | 'evening' {
  if (hour < 12) return 'morning'
  return hour < 19 ? 'afternoon' : 'evening'
}

export interface TaxRate { id: number; amount: number; priceInclude: boolean }
export interface CartLine { unitPrice: number; qty: number; taxIds: number[] }
// Totales de la ronda con los impuestos reales de Odoo (porcentaje, incluido o no en el precio). Solo para mostrar:
// el total definitivo lo recalcula Odoo al guardar.
export function cartTotals(lines: CartLine[], taxes: TaxRate[]): { subtotal: number; tax: number; total: number } {
  let subtotal = 0
  let tax = 0
  lines.forEach((l) => {
    const rates = taxes.filter((t) => l.taxIds.includes(t.id))
    const included = rates.filter((t) => t.priceInclude).reduce((a, t) => a + t.amount, 0)
    const base = (l.unitPrice * l.qty) / (1 + included / 100)
    subtotal += base
    tax += rates.reduce((a, t) => a + (base * t.amount) / 100, 0)
  })
  return { subtotal: Math.round(subtotal), tax: Math.round(tax), total: Math.round(subtotal + tax) }
}
