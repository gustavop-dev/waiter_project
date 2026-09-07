import { changePin, getEmployeeProfile, listPosEmployees, openAttendance } from '@/lib/services/employees'
import { callKw } from '@/lib/services/odoo'

jest.mock('@/lib/services/odoo', () => ({ callKw: jest.fn() }))
const rpc = callKw as jest.Mock
const monday = new Date(2026, 8, 7, 9)

beforeEach(() => rpc.mockReset())

// Falla si los empleados no salen de load_data con su `_pin`, o si el turno de hoy no viene de resource.calendar.
it('lists the terminal employees from load_data with pin hash and today shift', async () => {
  rpc.mockImplementation(async (model: string, method: string) => {
    if (model === 'pos.session' && method === 'load_data') return { 'hr.employee': [{ id: 2, name: 'Mesero Demo', user_id: false, _pin: 'abc' }, { id: 1, name: 'Administrator', user_id: 2, _pin: false }] }
    if (model === 'hr.employee') return [{ id: 2, resource_calendar_id: [5, 'Apertura'] }, { id: 1, resource_calendar_id: false }]
    if (model === 'resource.calendar.attendance') return [{ calendar_id: [5, 'Apertura'], dayofweek: '0', hour_from: 12, hour_to: 15 }, { calendar_id: [5, 'Apertura'], dayofweek: '0', hour_from: 18, hour_to: 22 }]
    throw new Error(`unexpected ${model}.${method}`)
  })
  const list = await listPosEmployees(16, monday)
  expect(list.map((e) => e.name)).toEqual(['Administrator', 'Mesero Demo'])
  expect(list[1]).toMatchObject({ pinHash: 'abc', shift: { from: 12, to: 22 } })
  expect(list[0]).toMatchObject({ pinHash: null, shift: null, userId: 2 })
  expect(rpc.mock.calls[2][2][0]).toEqual([['calendar_id', 'in', [5]], ['dayofweek', '=', '0']])
})

// Falla si una asistencia abierta se duplica al volver a entrar, o si la nueva no lleva check_in.
it('openAttendance reuses the open attendance and otherwise creates one', async () => {
  rpc.mockResolvedValueOnce([{ id: 9, check_in: '2026-09-07 12:00:00' }])
  expect(await openAttendance(2)).toEqual({ id: 9, checkIn: '2026-09-07 12:00:00' })
  rpc.mockResolvedValueOnce([]).mockResolvedValueOnce(10)
  const created = await openAttendance(2, new Date(Date.UTC(2026, 8, 7, 14, 30)))
  expect(created).toEqual({ id: 10, checkIn: '2026-09-07 14:30:00' })
  expect(rpc).toHaveBeenLastCalledWith('hr.attendance', 'create', [{ employee_id: 2, check_in: '2026-09-07 14:30:00' }])
})

// Falla si un usuario sin RR. HH. deja el perfil sin cargar en vez de mostrar "—" en los campos privados.
it('profile degrades to nulls when private fields are denied and writes the pin on change', async () => {
  rpc.mockImplementation(async (model: string, method: string, args: unknown[]) => {
    if (model === 'hr.employee' && method === 'read' && (args[1] as string[]).includes('private_street')) throw new Error('denied')
    if (model === 'hr.employee' && method === 'read') return [{ id: 2, name: 'Mesero Demo', work_phone: '300', mobile_phone: false, work_email: false, parent_id: [1, 'Administrator'], user_id: [7, 'Julián'], resource_calendar_id: false }]
    if (model === 'res.users') return [{ waiter_role: 'cashier', email: 'j@x.co', phone: false }]
    return undefined
  })
  const profile = await getEmployeeProfile(2, monday)
  expect(profile).toMatchObject({ phone: '300', email: 'j@x.co', address: null, joiningDate: null, accessRole: 'cashier', manager: 'Administrator', shift: null })
  await changePin(2, '654321')
  expect(rpc).toHaveBeenLastCalledWith('hr.employee', 'write', [[2], { pin: '654321' }])
})
