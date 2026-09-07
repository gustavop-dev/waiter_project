// Reglas puras del empleado: validación del PIN como la hace el POS de Odoo (sha1 en cliente contra
// el `_pin` que entrega pos.session.load_data), turno del día desde resource.calendar y cronómetro.

function utf8(str: string): number[] {
  const out: number[] = []
  for (const ch of str) {
    const cp = ch.codePointAt(0) ?? 0
    if (cp < 0x80) out.push(cp)
    else if (cp < 0x800) out.push(0xc0 | (cp >> 6), 0x80 | (cp & 63))
    else if (cp < 0x10000) out.push(0xe0 | (cp >> 12), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63))
    else out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63))
  }
  return out
}

const rotl = (x: number, n: number) => (x << n) | (x >>> (32 - n))

// SHA-1 en JS puro: crypto.subtle solo existe en contextos seguros y las tablets entran por http.
export function sha1(message: string): string {
  const msg = utf8(message)
  const bits = msg.length * 8
  const words: number[] = []
  for (let i = 0; i < msg.length; i++) words[i >> 2] = (words[i >> 2] ?? 0) | (msg[i] << (24 - (i % 4) * 8))
  words[msg.length >> 2] = (words[msg.length >> 2] ?? 0) | (0x80 << (24 - (msg.length % 4) * 8))
  const total = (((msg.length + 8) >> 6) + 1) * 16
  for (let i = 0; i < total; i++) words[i] = words[i] ?? 0
  words[total - 1] = bits >>> 0
  words[total - 2] = Math.floor(bits / 0x100000000)
  let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0
  const w = new Array<number>(80)
  for (let i = 0; i < total; i += 16) {
    for (let t = 0; t < 16; t++) w[t] = words[i + t]
    for (let t = 16; t < 80; t++) w[t] = rotl(w[t - 3] ^ w[t - 8] ^ w[t - 14] ^ w[t - 16], 1)
    let a = h0, b = h1, c = h2, d = h3, e = h4
    for (let t = 0; t < 80; t++) {
      const f = t < 20 ? (b & c) | (~b & d) : t < 40 ? b ^ c ^ d : t < 60 ? (b & c) | (b & d) | (c & d) : b ^ c ^ d
      const k = t < 20 ? 0x5a827999 : t < 40 ? 0x6ed9eba1 : t < 60 ? 0x8f1bbcdc : 0xca62c1d6
      const temp = (rotl(a, 5) + f + e + k + w[t]) | 0
      e = d; d = c; c = rotl(b, 30); b = a; a = temp
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0; h4 = (h4 + e) | 0
  }
  return [h0, h1, h2, h3, h4].map((h) => (h >>> 0).toString(16).padStart(8, '0')).join('')
}

// Un empleado sin PIN en Odoo (`_pin` false) entra sin escribir nada, igual que en el POS de Odoo.
export function pinMatches(pin: string, pinHash: string | null): boolean {
  if (!pinHash) return pin === ''
  return pin.length > 0 && sha1(pin) === pinHash
}

export interface CalendarSlot { dayofweek: string; hour_from: number; hour_to: number }
export interface Shift { from: number; to: number }

// Odoo numera los días de lunes (0) a domingo (6); JS de domingo (0) a sábado (6).
export const odooWeekday = (date: Date): string => String((date.getDay() + 6) % 7)

// Turno de hoy: del primer inicio al último fin de las franjas del calendario para ese día. null = sin horario.
export function todayShift(slots: CalendarSlot[], date: Date): Shift | null {
  const today = slots.filter((s) => s.dayofweek === odooWeekday(date))
  if (today.length === 0) return null
  return { from: Math.min(...today.map((s) => s.hour_from)), to: Math.max(...today.map((s) => s.hour_to)) }
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

// Cronómetro del turno "04:25:32" (tarjeta Time del modal Setting).
export function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), s = total % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

export const EMPLOYEE_KEY = 'waiter.employee'
export interface StoredEmployee { id: number; checkIn: string }
// El empleado activo se recuerda en el dispositivo (id y hora de entrada) para sobrevivir a una recarga.
export function readStoredEmployee(): StoredEmployee | null {
  try {
    const raw = JSON.parse(localStorage.getItem(EMPLOYEE_KEY) || 'null') as Partial<StoredEmployee> | null
    return raw && Number.isInteger(raw.id) && (raw.id as number) > 0 && typeof raw.checkIn === 'string' ? { id: raw.id as number, checkIn: raw.checkIn } : null
  } catch { return null }
}
export function storeEmployee(value: StoredEmployee | null): void {
  try { if (value) localStorage.setItem(EMPLOYEE_KEY, JSON.stringify(value)); else localStorage.removeItem(EMPLOYEE_KEY) } catch { /* sin almacenamiento */ }
}
