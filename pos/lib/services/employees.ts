import { odooWeekday, sha1, toOdooDatetime, todayShift, type CalendarSlot, type Shift } from '@/lib/domain/employees'
import type { Role } from '@/lib/domain/roles'
import { callKw } from '@/lib/services/odoo'

// Empleados del terminal (pos_hr) y su asistencia (hr_attendance). Es el único archivo que conoce
// `_pin` de load_data, hr.attendance y los campos de hr.employee.
export interface PosEmployee { id: number; name: string; userId: number | null; pinHash: string | null; shift: Shift | null }
export interface EmployeeProfile {
  id: number; name: string; phone: string | null; email: string | null; address: string | null; joiningDate: string | null
  accessRole: Role | null; employmentType: string | null; manager: string | null; shift: Shift | null
}
export interface Attendance { id: number; checkIn: string }

interface RawPosEmployee { id: number; name: string; user_id: number | false; _pin?: string | false }
interface RawCalendarRef { id: number; resource_calendar_id: [number, string] | false }
interface RawSlot extends CalendarSlot { calendar_id: [number, string] }
interface RawPublic { id: number; name: string; work_phone: string | false; mobile_phone: string | false; work_email: string | false; parent_id: [number, string] | false; user_id: [number, string] | false; resource_calendar_id: [number, string] | false }
interface RawPrivate { private_email: string | false; private_street: string | false; private_city: string | false; contract_date_start: string | false; employee_type: string | false }
interface RawUser { waiter_role: Role | false; email: string | false; phone: string | false }
interface RawAttendance { id: number; check_in: string }

const EMPLOYEE = 'hr.employee'
const ATTENDANCE = 'hr.attendance'
const or = (v: string | false | undefined): string | null => (v ? v : null)

// Turnos de hoy por calendario: del primer inicio al último fin de las franjas de resource.calendar.
async function shiftsByCalendar(calendarIds: number[], today: Date): Promise<Map<number, Shift | null>> {
  const out = new Map<number, Shift | null>()
  if (calendarIds.length === 0) return out
  const slots = await callKw<RawSlot[]>('resource.calendar.attendance', 'search_read',
    [[['calendar_id', 'in', calendarIds], ['dayofweek', '=', odooWeekday(today)]], ['calendar_id', 'dayofweek', 'hour_from', 'hour_to']])
  for (const id of calendarIds) out.set(id, todayShift(slots.filter((s) => s.calendar_id[0] === id), today))
  return out
}

async function calendarOf(ids: number[]): Promise<Map<number, number | null>> {
  const rows = await callKw<RawCalendarRef[]>(EMPLOYEE, 'search_read', [[['id', 'in', ids]], ['resource_calendar_id']])
  return new Map(rows.map((r) => [r.id, r.resource_calendar_id ? r.resource_calendar_id[0] : null]))
}

// Con sesión abierta, pos.session.load_data trae los empleados del terminal con `_pin` en sha1 (pos_hr).
// Sin sesión (caja cerrada) se leen de hr.employee y se hashea aquí: solo lo logra un usuario de RR. HH.
async function rawEmployees(sessionId: number | null): Promise<RawPosEmployee[]> {
  if (sessionId) {
    const data = await callKw<{ 'hr.employee'?: RawPosEmployee[] }>('pos.session', 'load_data', [[sessionId], []])
    return data['hr.employee'] ?? []
  }
  const rows = await callKw<{ id: number; name: string; user_id: [number, string] | false; pin: string | false }[]>(EMPLOYEE, 'search_read', [[], ['name', 'user_id', 'pin']])
  return rows.map((r) => ({ id: r.id, name: r.name, user_id: r.user_id ? r.user_id[0] : false, _pin: r.pin ? sha1(r.pin) : false }))
}

export async function listPosEmployees(sessionId: number | null, today = new Date()): Promise<PosEmployee[]> {
  const raw = await rawEmployees(sessionId)
  if (raw.length === 0) return []
  const calendars = await calendarOf(raw.map((r) => r.id))
  const shifts = await shiftsByCalendar([...new Set([...calendars.values()].filter((c): c is number => c !== null))], today)
  return raw
    .map((r) => ({ id: r.id, name: r.name, userId: r.user_id || null, pinHash: r._pin || null, shift: shifts.get(calendars.get(r.id) ?? -1) ?? null }))
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
}

// Perfil para "Información del empleado". Los campos privados y de contrato solo los lee RR. HH.: si Odoo los niega, quedan en null ("—").
export async function getEmployeeProfile(id: number, today = new Date()): Promise<EmployeeProfile> {
  const [pub] = await callKw<RawPublic[]>(EMPLOYEE, 'read', [[id], ['name', 'work_phone', 'mobile_phone', 'work_email', 'parent_id', 'user_id', 'resource_calendar_id']])
  const priv = await callKw<RawPrivate[]>(EMPLOYEE, 'read', [[id], ['private_email', 'private_street', 'private_city', 'contract_date_start', 'employee_type']]).then((r) => r[0]).catch(() => null)
  const user = pub.user_id ? await callKw<RawUser[]>('res.users', 'read', [[pub.user_id[0]], ['waiter_role', 'email', 'phone']]).then((r) => r[0]).catch(() => null) : null
  const calendarId = pub.resource_calendar_id ? pub.resource_calendar_id[0] : null
  const shift = calendarId ? (await shiftsByCalendar([calendarId], today)).get(calendarId) ?? null : null
  const address = [or(priv?.private_street), or(priv?.private_city)].filter(Boolean).join(', ')
  return {
    id, name: pub.name, phone: or(pub.work_phone) ?? or(pub.mobile_phone) ?? or(user?.phone), email: or(pub.work_email) ?? or(priv?.private_email) ?? or(user?.email),
    address: address || null, joiningDate: or(priv?.contract_date_start), accessRole: user?.waiter_role || null, employmentType: or(priv?.employee_type),
    manager: pub.parent_id ? pub.parent_id[1] : null, shift,
  }
}

export async function employeeName(id: number): Promise<string> {
  const [row] = await callKw<{ name: string }[]>(EMPLOYEE, 'read', [[id], ['name']])
  return row.name
}

export async function findOpenAttendance(employeeId: number): Promise<Attendance | null> {
  const rows = await callKw<RawAttendance[]>(ATTENDANCE, 'search_read', [[['employee_id', '=', employeeId], ['check_out', '=', false]], ['check_in']], { limit: 1, order: 'check_in desc' })
  return rows.length ? { id: rows[0].id, checkIn: rows[0].check_in } : null
}

// Entrada del turno: reutiliza la asistencia abierta (una recarga no duplica) o crea una con check_in ahora.
export async function openAttendance(employeeId: number, now = new Date()): Promise<Attendance> {
  const open = await findOpenAttendance(employeeId)
  if (open) return open
  const checkIn = toOdooDatetime(now)
  const id = await callKw<number>(ATTENDANCE, 'create', [{ employee_id: employeeId, check_in: checkIn }])
  return { id, checkIn }
}

export function closeAttendance(attendanceId: number, now = new Date()): Promise<void> {
  return callKw<void>(ATTENDANCE, 'write', [[attendanceId], { check_out: toOdooDatetime(now) }])
}

export function changePin(employeeId: number, pin: string): Promise<void> {
  return callKw<void>(EMPLOYEE, 'write', [[employeeId], { pin }])
}
