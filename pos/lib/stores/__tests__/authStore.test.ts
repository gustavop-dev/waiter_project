import { activeEmployeeId, useAuthStore } from '@/lib/stores/authStore'
import { closeAttendance, employeeName, findOpenAttendance, openAttendance } from '@/lib/services/employees'
import { currentUser, getOpenSession } from '@/lib/services/session'

jest.mock('@/lib/services/employees', () => ({ openAttendance: jest.fn(), closeAttendance: jest.fn(), findOpenAttendance: jest.fn(), employeeName: jest.fn() }))
jest.mock('@/lib/services/session', () => ({ currentUser: jest.fn(), getOpenSession: jest.fn(), login: jest.fn(), logout: jest.fn() }))
jest.mock('@/lib/services/cashRegister', () => ({ openRegister: jest.fn() }))

beforeEach(() => { localStorage.clear(); useAuthStore.setState({ user: null, session: null, employee: null, hydrated: false }) })

// Falla si iniciar turno no registra la entrada, no guarda al empleado en el dispositivo o no lo expone a los pedidos.
it('startShift records the attendance, remembers the employee and exposes its id', async () => {
  ;(openAttendance as jest.Mock).mockResolvedValue({ id: 9, checkIn: '2026-09-07 12:00:00' })
  await useAuthStore.getState().startShift({ id: 2, name: 'Mesero Demo' })
  expect(useAuthStore.getState().employee).toEqual({ id: 2, name: 'Mesero Demo', checkIn: '2026-09-07T12:00:00.000Z', attendanceId: 9 })
  expect(JSON.parse(localStorage.getItem('waiter.employee') ?? '{}')).toMatchObject({ id: 2 })
  expect(activeEmployeeId()).toBe(2)
})

// Falla si un terminal sin permiso de asistencia bloquea el turno, o si cerrar sesión no cierra la asistencia ni limpia al empleado.
it('starts without attendance rights and endShift closes the attendance and clears the employee', async () => {
  ;(openAttendance as jest.Mock).mockRejectedValue(new Error('denied'))
  await useAuthStore.getState().startShift({ id: 3, name: 'Sofía' })
  expect(useAuthStore.getState().employee).toMatchObject({ id: 3, attendanceId: null })
  useAuthStore.setState({ employee: { id: 3, name: 'Sofía', checkIn: '', attendanceId: 4 } })
  await useAuthStore.getState().endShift()
  expect(closeAttendance).toHaveBeenCalledWith(4)
  expect(useAuthStore.getState().employee).toBeNull()
  expect(localStorage.getItem('waiter.employee')).toBeNull()
})

// Falla si hidratar con sesión de Odoo no recupera al empleado guardado en el dispositivo.
it('hydrate restores the stored employee with its open attendance', async () => {
  localStorage.setItem('waiter.employee', JSON.stringify({ id: 2, checkIn: '2026-09-07T10:00:00.000Z' }))
  ;(currentUser as jest.Mock).mockResolvedValue({ uid: 2, name: 'Admin', companyId: 1, role: 'admin' })
  ;(getOpenSession as jest.Mock).mockResolvedValue({ id: 16, configId: 1, state: 'opened' })
  ;(employeeName as jest.Mock).mockResolvedValue('Mesero Demo')
  ;(findOpenAttendance as jest.Mock).mockResolvedValue({ id: 9, checkIn: '2026-09-07 12:00:00' })
  await useAuthStore.getState().hydrate()
  expect(useAuthStore.getState().employee).toEqual({ id: 2, name: 'Mesero Demo', checkIn: '2026-09-07T12:00:00.000Z', attendanceId: 9 })
  expect(useAuthStore.getState().hydrated).toBe(true)
})
