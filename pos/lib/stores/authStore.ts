'use client'

import { create } from 'zustand'

import { fromOdooDatetime, readStoredEmployee, storeEmployee, type Shift } from '@/lib/domain/employees'
import type { Role } from '@/lib/domain/roles'
import { openRegister as openRegisterRequest } from '@/lib/services/cashRegister'
import { endShift as endShiftRequest, findOpenAttendance, readEmployee, type CheckedEmployee } from '@/lib/services/employees'
import { currentUser, getOpenSession, login as loginRequest, logout as logoutRequest } from '@/lib/services/session'
import type { AuthUser, PosSession } from '@/lib/services/session'

// Empleado activo en este dispositivo (pos_hr): quien firma los pedidos. El PIN lo validó el servidor
// (`waiter_check_pin`), que además abrió la asistencia: `checkIn` (ISO) alimenta el cronómetro del turno.
export interface ActiveEmployee {
  id: number; name: string; code: string | null; role: Role | null; shift: Shift | null
  userId: number | null; checkIn: string; attendanceId: number | null
}

interface AuthState {
  user: AuthUser | null
  session: PosSession | null
  employee: ActiveEmployee | null
  hydrated: boolean
  login: (login: string, password: string) => Promise<void>
  hydrate: () => Promise<void>
  logout: () => Promise<void>
  refreshSession: () => Promise<void>
  openRegister: (configId: number, openingCash: number, notes: string) => Promise<void>
  startShift: (employee: CheckedEmployee, attendanceId: number) => Promise<void>
  endShift: () => Promise<void>
}

const toIso = (odoo: string) => fromOdooDatetime(odoo).toISOString()

// Tras una recarga se relee el empleado guardado y su asistencia abierta; si Odoo ya no lo conoce, se suelta.
async function restoreEmployee(): Promise<ActiveEmployee | null> {
  const stored = readStoredEmployee()
  if (!stored) return null
  try {
    const employee = await readEmployee(stored.id)
    const open = await findOpenAttendance(stored.id).catch(() => null)
    return { ...employee, userId: null, checkIn: open ? toIso(open.checkIn) : stored.checkIn, attendanceId: open?.id ?? null }
  } catch {
    storeEmployee(null)
    return null
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  employee: null,
  hydrated: false,
  login: async (l, p) => {
    const user = await loginRequest(l, p)
    const session = await getOpenSession()
    set({ user, session, hydrated: true })
  },
  // La cookie de Odoo es HttpOnly: la única forma de saber si hay sesión es preguntar.
  hydrate: async () => {
    try {
      const user = await currentUser()
      const session = user ? await getOpenSession() : null
      const employee = user ? await restoreEmployee() : null
      set({ session, user, employee, hydrated: true })
    } catch {
      set({ user: null, session: null, employee: null, hydrated: true })
    }
  },
  refreshSession: async () => set({ session: await getOpenSession() }),
  openRegister: async (configId, cash, notes) => set({ session: await openRegisterRequest(configId, cash, notes) }),
  // El PIN ya lo validó `waiter_check_pin`, que devolvió al empleado y la asistencia recién abierta.
  startShift: async (employee, attendanceId) => {
    const open = await findOpenAttendance(employee.id).catch(() => null)
    const checkIn = open ? toIso(open.checkIn) : new Date().toISOString()
    storeEmployee({ id: employee.id, checkIn })
    set({ employee: { ...employee, checkIn, attendanceId } })
  },
  // "Cerrar sesión" del kit: cierra la asistencia (`waiter_end_shift`) y suelta al empleado; la sesión de Odoo del terminal sigue.
  endShift: async () => {
    const current = get().employee
    if (current) { try { await endShiftRequest(current.id) } catch { /* sin permiso de asistencia: el turno termina igual */ } }
    storeEmployee(null)
    set({ employee: null })
  },
  logout: async () => {
    await logoutRequest()
    storeEmployee(null)
    set({ user: null, session: null, employee: null })
  },
}))

// Para los servicios que firman pedidos (pos_hr: pos.order.employee_id).
export const activeEmployeeId = (): number | null => useAuthStore.getState().employee?.id ?? null
