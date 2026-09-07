import { endShift, findOpenAttendance, readEmployee } from '@/lib/services/employees'
import { currentUser, getOpenSession } from '@/lib/services/session'
import { activeEmployeeId, useAuthStore } from '@/lib/stores/authStore'

jest.mock('@/lib/services/employees', () => ({ endShift: jest.fn(), findOpenAttendance: jest.fn(), readEmployee: jest.fn() }))
jest.mock('@/lib/services/session', () => ({ currentUser: jest.fn(), getOpenSession: jest.fn(), login: jest.fn(), logout: jest.fn() }))
jest.mock('@/lib/services/cashRegister', () => ({ openRegister: jest.fn() }))

const SOFIA = { id: 2, name: 'Sofía Mesera', code: 'WT-0001', role: 'waiter' as const, shift: { from: 8, to: 16 }, userId: null }

beforeEach(() => { localStorage.clear(); jest.clearAllMocks(); useAuthStore.setState({ user: null, session: null, employee: null, hydrated: false }) })

// Falla si iniciar turno pierde la asistencia que abrió `waiter_check_pin`, no recuerda al empleado o no lo expone a los pedidos.
it('startShift keeps the attendance opened by the server and remembers the employee', async () => {
  ;(findOpenAttendance as jest.Mock).mockResolvedValue({ id: 9, checkIn: '2026-09-07 12:00:00' })
  await useAuthStore.getState().startShift(SOFIA, 9)
  expect(useAuthStore.getState().employee).toMatchObject({ id: 2, code: 'WT-0001', checkIn: '2026-09-07T12:00:00.000Z', attendanceId: 9 })
  expect(JSON.parse(localStorage.getItem('waiter.employee') ?? '{}')).toMatchObject({ id: 2 })
  expect(activeEmployeeId()).toBe(2)
})

// Falla si cerrar sesión no cierra el turno en el servidor (`waiter_end_shift`) o deja al empleado en el dispositivo.
it('endShift closes the shift on the server and clears the employee', async () => {
  useAuthStore.setState({ employee: { ...SOFIA, checkIn: '', attendanceId: 4 } })
  ;(endShift as jest.Mock).mockResolvedValue({ ok: true, attendanceId: 4, workedHours: 4.25 })
  await useAuthStore.getState().endShift()
  expect(endShift).toHaveBeenCalledWith(2)
  expect(useAuthStore.getState().employee).toBeNull()
  expect(localStorage.getItem('waiter.employee')).toBeNull()
})

// Falla si hidratar con sesión de Odoo no recupera al empleado guardado en el dispositivo.
it('hydrate restores the stored employee with its open attendance', async () => {
  localStorage.setItem('waiter.employee', JSON.stringify({ id: 2, checkIn: '2026-09-07T10:00:00.000Z' }))
  ;(currentUser as jest.Mock).mockResolvedValue({ uid: 2, name: 'Admin', companyId: 1, role: 'admin' })
  ;(getOpenSession as jest.Mock).mockResolvedValue({ id: 16, configId: 1, state: 'opened' })
  ;(readEmployee as jest.Mock).mockResolvedValue({ id: 2, name: 'Sofía Mesera', code: 'WT-0001', role: 'waiter', shift: null })
  ;(findOpenAttendance as jest.Mock).mockResolvedValue({ id: 9, checkIn: '2026-09-07 12:00:00' })
  await useAuthStore.getState().hydrate()
  expect(useAuthStore.getState().employee).toMatchObject({ id: 2, name: 'Sofía Mesera', checkIn: '2026-09-07T12:00:00.000Z', attendanceId: 9 })
  expect(useAuthStore.getState().hydrated).toBe(true)
})
