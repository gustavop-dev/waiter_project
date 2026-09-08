import type { ReservationCard, ReservationState, Slot, TimelineTable } from '@/lib/domain/reservations'
import { callKw } from '@/lib/services/odoo'

// Reservas del kit sobre el addon `projectapp_reservations`: el servidor calcula franjas, solapes y estados.
// Aquí solo se llaman sus métodos y se traduce la forma a camelCase.

const MODEL = 'waiter.reservation'

interface RawCard {
  id: number; name: string; customer_name: string; people: number; baby_chair: boolean; state: ReservationState
  date: string; time_start: number; time_end: number; label: string; time_label: string
  table_id: number; table_number: number; floor_id: number; floor_name: string
}
interface RawTable { id: number; table_number: number; name: string; seats: number; floor_id: number; floor_name: string; shape: string }
interface RawTimeline { date: string; slots: Slot[]; floors: { id: number; name: string }[]; tables: (RawTable & { reservations: RawCard[] })[] }
interface RawLine { id: number; product_id: number; product_tmpl_id: number; name: string; qty: number; price_unit: number; price_subtotal_incl: number; note: string }
interface RawDetail extends RawCard { customer_email: string; customer_phone: string; notes: string; amount_total: number; lines: RawLine[] }

export interface AvailableTable extends Omit<RawTable, 'table_number' | 'floor_id' | 'floor_name'> {
  tableNumber: number; floorId: number; floorName: string
  status: 'available' | 'reserved' | 'unavailable'; available: boolean; reservedAt: string | false
}
export interface ReservationLine { id: number; productId: number; productTmplId: number; name: string; qty: number; priceUnit: number; total: number; note: string }
export interface ReservationDetail extends ReservationCard { customerEmail: string; customerPhone: string; notes: string; amountTotal: number; lines: ReservationLine[] }
export interface Timeline { date: string; slots: Slot[]; floors: { id: number; name: string }[]; tables: TimelineTable[] }
export interface NewReservation {
  customerName: string; customerEmail: string; customerPhone: string; people: number; babyChair: boolean
  notes: string; date: string; timeStart: number; tableId: number; configId: number; prepMinutes: string
}
export interface PreorderLine { productId: number; qty: number; note?: string }

const card = (r: RawCard): ReservationCard => ({
  id: r.id, name: r.name, customerName: r.customer_name, people: r.people, babyChair: r.baby_chair, state: r.state,
  date: r.date, timeStart: r.time_start, timeEnd: r.time_end, label: r.label, timeLabel: r.time_label,
  tableId: r.table_id, tableNumber: r.table_number, floorId: r.floor_id, floorName: r.floor_name,
})

const detail = (r: RawDetail): ReservationDetail => ({
  ...card(r), customerEmail: r.customer_email, customerPhone: r.customer_phone, notes: r.notes, amountTotal: r.amount_total,
  lines: r.lines.map((l) => ({ id: l.id, productId: l.product_id, productTmplId: l.product_tmpl_id, name: l.name, qty: l.qty, priceUnit: l.price_unit, total: l.price_subtotal_incl, note: l.note })),
})

export async function getTimeline(configId: number, date: string, floorId?: number | null): Promise<Timeline> {
  const raw = await callKw<RawTimeline>(MODEL, 'waiter_timeline', [configId, date, floorId ?? false])
  return {
    date: raw.date, slots: raw.slots, floors: raw.floors,
    tables: raw.tables.map((t) => ({ id: t.id, tableNumber: t.table_number, name: t.name, seats: t.seats, floorId: t.floor_id, reservations: t.reservations.map(card) })),
  }
}

export const getSlots = (configId: number, date: string): Promise<Slot[]> => callKw<Slot[]>(MODEL, 'waiter_slots', [configId, date])

export async function getAvailableTables(configId: number, date: string, timeStart: number, people: number, prepMinutes: string = '30'): Promise<AvailableTable[]> {
  const raw = await callKw<(RawTable & { status: AvailableTable['status']; available: boolean; reserved_at: string | false })[]>(
    MODEL, 'waiter_available_tables', [configId, date, timeStart, people, false, true, prepMinutes])
  return raw.map((t) => ({ id: t.id, tableNumber: t.table_number, name: t.name, seats: t.seats, floorId: t.floor_id, floorName: t.floor_name, shape: t.shape, status: t.status, available: t.available, reservedAt: t.reserved_at }))
}

export async function createReservation(input: NewReservation, lines: PreorderLine[]): Promise<ReservationDetail> {
  const vals = {
    customer_name: input.customerName, customer_email: input.customerEmail || false, customer_phone: input.customerPhone || false,
    people: input.people, baby_chair: input.babyChair, notes: input.notes || false,
    date: input.date, time_start: input.timeStart, table_id: input.tableId, config_id: input.configId,
    prep_minutes: input.prepMinutes,
  }
  const raw = await callKw<RawDetail>(MODEL, 'waiter_create', [vals, lines.map((l) => ({ product_id: l.productId, qty: l.qty, note: l.note ?? '' }))])
  return detail(raw)
}

export async function getReservation(id: number): Promise<ReservationDetail | null> {
  const raw = await callKw<RawDetail[]>(MODEL, 'waiter_detail', [[id]])
  return raw[0] ? detail(raw[0]) : null
}

/** Reservas activas de una mesa, para el modal "Lista de reservas" del plano. */
export async function listByTable(tableId: number): Promise<ReservationCard[]> {
  const ids = await callKw<{ id: number }[]>(MODEL, 'search_read', [[['table_id', '=', tableId], ['state', 'in', ['confirmed', 'seated']]], ['id']], { order: 'date, time_start' })
  if (ids.length === 0) return []
  const raw = await callKw<RawDetail[]>(MODEL, 'waiter_detail', [ids.map((r) => r.id)])
  return raw.map(card)
}

const ACTIONS = { seated: 'action_seated', no_show: 'action_no_show', cancelled: 'action_cancel' } as const
export const setReservationState = (id: number, state: keyof typeof ACTIONS): Promise<boolean> => callKw<boolean>(MODEL, ACTIONS[state], [[id]])

/** Próxima reserva por mesa del día: la usa el plano para pintar "Reservada · 17:00". */
export const reservedAtByTable = (date: string): Promise<Record<string, { label: string } | false>> =>
  callKw<Record<string, { label: string } | false>>('restaurant.table', 'waiter_reserved_at', [[], date])
