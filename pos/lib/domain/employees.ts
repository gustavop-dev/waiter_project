// Reglas puras del empleado: turno de hoy (shift_start / shift_end de hr.employee, horas decimales),
// cronómetro del turno y el empleado recordado en el dispositivo. El PIN se valida siempre en el
// servidor (`hr.employee.waiter_check_pin`): aquí nunca hay hash ni comparación de PIN.

export interface Shift { from: number; to: number }

// Odoo entrega 0.0 cuando el campo Float está vacío: un turno de 0 a 0 es "Sin horario".
export function toShift(start: number | false | null | undefined, end: number | false | null | undefined): Shift | null {
  const from = Number(start) || 0
  const to = Number(end) || 0
  if (from === 0 && to === 0) return null
  return { from, to }
}

// 10.5 → "10:30 a. m."; 14 → "2:00 p. m." (forma española de las 12 horas del kit).
export function formatHour(hour: number): string {
  const h = Math.floor(hour), m = Math.round((hour - h) * 60)
  const suffix = h < 12 || h === 24 ? 'a. m.' : 'p. m.'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${suffix}`
}

export const shiftLabel = (shift: Shift | null, none: string): string => (shift ? `${formatHour(shift.from)} – ${formatHour(shift.to)}` : none)

// Las fechas de Odoo llegan en UTC sin zona ("2026-09-06 10:00:00").
export const fromOdooDatetime = (value: string): Date => new Date(value.replace(' ', 'T') + 'Z')
export const toOdooDatetime = (date: Date): string => date.toISOString().slice(0, 19).replace('T', ' ')

// Cronómetro del turno "04:25:32" (tarjeta Tiempo del modal Ajustes).
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

// "PIN bloqueado hasta" → minutos que faltan, redondeados hacia arriba (nunca menos de 1).
export function lockMinutesLeft(lockedUntil: string, now = new Date()): number {
  const ms = fromOdooDatetime(lockedUntil).getTime() - now.getTime()
  return Math.max(1, Math.ceil(ms / 60_000))
}

export const EMPLOYEE_KEY = 'waiter.employee'
export interface StoredEmployee { id: number; checkIn: string; token: string }
// El empleado activo se recuerda en el dispositivo (id, hora de entrada y token de sesión) para sobrevivir
// a una recarga. El token nunca se muestra: solo viaja a Odoo para probar quién pide el cambio de PIN o el
// cierre del turno; caduca a las 16 horas y muere al cerrar el turno.
export function readStoredEmployee(): StoredEmployee | null {
  try {
    const raw = JSON.parse(localStorage.getItem(EMPLOYEE_KEY) || 'null') as Partial<StoredEmployee> | null
    if (!raw || !Number.isInteger(raw.id) || (raw.id as number) <= 0 || typeof raw.checkIn !== 'string') return null
    return { id: raw.id as number, checkIn: raw.checkIn, token: typeof raw.token === 'string' ? raw.token : '' }
  } catch { return null }
}
export function storeEmployee(value: StoredEmployee | null): void {
  try { if (value) localStorage.setItem(EMPLOYEE_KEY, JSON.stringify(value)); else localStorage.removeItem(EMPLOYEE_KEY) } catch { /* sin almacenamiento */ }
}
