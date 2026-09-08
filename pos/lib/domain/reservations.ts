// Reglas puras de las reservas del kit (7 – Reservation). El servidor manda: solapes, franjas y estados
// los calcula `projectapp_reservations`. Aquí solo va lo que necesita pintar la grilla y validar el paso 1.

export const SLOT_HOURS = 0.5
export const RESERVATION_STATES = ['confirmed', 'seated', 'no_show', 'cancelled'] as const
export type ReservationState = (typeof RESERVATION_STATES)[number]
export const ACTIVE_STATES: ReservationState[] = ['confirmed', 'seated']

export interface Slot { time: number; label: string; past: boolean }
export interface ReservationCard {
  id: number; name: string; customerName: string; people: number; babyChair: boolean; state: ReservationState
  date: string; timeStart: number; timeEnd: number; label: string; timeLabel: string
  tableId: number; tableNumber: number; floorId: number; floorName: string
}
export interface TimelineTable { id: number; tableNumber: number; name: string; seats: number; floorId: number; reservations: ReservationCard[] }

/** Hora decimal (10.5) al reloj del kit ("10:30"). */
export const hourLabel = (hour: number): string => {
  const h = Math.floor(hour)
  return `${String(h).padStart(2, '0')}:${String(Math.round((hour - h) * 60)).padStart(2, '0')}`
}

/** Columna y ancho de una tarjeta en la grilla mesa × hora: el ancho es la duración, como en el kit. */
export function cardPlacement(card: { timeStart: number; timeEnd: number }, slots: Slot[]): { index: number; span: number } | null {
  if (slots.length === 0) return null
  const first = slots[0].time
  const index = Math.round((card.timeStart - first) / SLOT_HOURS)
  if (index < 0 || index >= slots.length) return null
  const span = Math.max(1, Math.min(Math.round((card.timeEnd - card.timeStart) / SLOT_HOURS), slots.length - index))
  return { index, span }
}

// Cuánto antes de la hora reservada se aparta la mesa. Es tiempo para prepararla, no porque el comensal
// esté ya en el local: fuera de esa ventana la mesa se usa con normalidad.
export const PREP_CHOICES = ['0', '15', '30', '60', '120'] as const
export type PrepMinutes = (typeof PREP_CHOICES)[number]

export interface ReservationDraft {
  customerName: string; customerEmail: string; customerPhone: string
  people: number; babyChair: boolean; notes: string
  date: string | null; timeStart: number | null; tableId: number | null; prepMinutes: PrepMinutes
}

export const emptyDraft = (): ReservationDraft => ({
  customerName: '', customerEmail: '', customerPhone: '', people: 2, babyChair: false, notes: '',
  date: null, timeStart: null, tableId: null, prepMinutes: '30',
})

// "20:00" con 30 minutos de margen → "19:30": la hora desde la que el plano deja de ofrecer la mesa.
export function holdLabel(timeStart: number, prep: PrepMinutes): string {
  const hold = Math.max(0, timeStart - Number(prep) / 60)
  const total = Math.round(hold * 60)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

/** El paso 1 pide nombre, personas y cuándo. El correo, si se escribe, debe parecer un correo. */
export function infoStepReady(draft: ReservationDraft): boolean {
  const emailOk = draft.customerEmail.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.customerEmail.trim())
  return draft.customerName.trim().length > 0 && draft.people > 0 && draft.date !== null && draft.timeStart !== null && emailOk
}

/** Días del mes para el calendario del modal, alineados a lunes y con los huecos del principio. */
export function monthGrid(year: number, month: number): (number | null)[] {
  const first = new Date(year, month, 1)
  const lead = (first.getDay() + 6) % 7
  const days = new Date(year, month + 1, 0).getDate()
  return [...Array<null>(lead).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)]
}

export const isoDate = (year: number, month: number, day: number): string =>
  `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
