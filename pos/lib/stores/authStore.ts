'use client'

import { create } from 'zustand'

import { fromOdooDatetime, readStoredEmployee, storeEmployee } from '@/lib/domain/employees'
import { openRegister as openRegisterRequest } from '@/lib/services/cashRegister'
import { closeAttendance, employeeName, findOpenAttendance, openAttendance } from '@/lib/services/employees'
import { currentUser, getOpenSession, login as loginRequest, logout as logoutRequest } from '@/lib/services/session'
import type { AuthUser, PosSession } from '@/lib/services/session'

// Empleado activo en este dispositivo (pos_hr): quien firma los pedidos. checkIn en ISO; attendanceId
// null cuando el usuario del terminal no puede registrar asistencia (se documenta en el informe).
export interface ActiveEmployee { id: number; name: string; checkIn: string; attendanceId: number | null }

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
  startShift: (employee: { id: number; name: string }) => Promise<void>
  endShift: () => Promise<void>
}

const toIso = (odoo: string) => fromOdooDatetime(odoo).toISOString()

// La asistencia es "lo mejor posible": si Odoo la niega, el turno arranca igual con la hora local.
async function attendanceFor(id: number, fallbackCheckIn: string): Promise<Pick<ActiveEmployee, 'checkIn' | 'attendanceId'>> {
  try {
    const att = await openAttendance(id)
    return { checkIn: toIso(att.checkIn), attendanceId: att.id }
  } catch {
    return { checkIn: fallbackCheckIn, attendanceId: null }
  }
}

async function restoreEmployee(): Promise<ActiveEmployee | null> {
  const stored = readStoredEmployee()
  if (!stored) return null
  try {
    const name = await employeeName(stored.id)
    const open = await findOpenAttendance(stored.id).catch(() => null)
    return { id: stored.id, name, checkIn: open ? toIso(open.checkIn) : stored.checkIn, attendanceId: open?.id ?? null }
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
  startShift: async ({ id, name }) => {
    const now = new Date().toISOString()
    const att = await attendanceFor(id, now)
    storeEmployee({ id, checkIn: att.checkIn })
    set({ employee: { id, name, ...att } })
  },
  // "Cerrar sesión" del kit: cierra la asistencia y suelta al empleado; la sesión de Odoo del terminal sigue.
  endShift: async () => {
    const current = get().employee
    if (current?.attendanceId) { try { await closeAttendance(current.attendanceId) } catch { /* sin permiso de asistencia: el turno termina igual */ } }
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
