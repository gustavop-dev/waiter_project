import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'

import LoginPage from '@/app/login/page'
import { sha1 } from '@/lib/domain/employees'
import { messages } from '@/lib/i18n/messages'
import { listPosEmployees } from '@/lib/services/employees'
import { useAuthStore } from '@/lib/stores/authStore'

const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))
jest.mock('@/lib/services/activation', () => ({ requestCode: jest.fn(async () => undefined), activate: jest.fn() }))
jest.mock('@/lib/services/employees', () => ({ listPosEmployees: jest.fn(), openAttendance: jest.fn(), closeAttendance: jest.fn(), findOpenAttendance: jest.fn(), employeeName: jest.fn() }))
jest.mock('@/lib/services/session', () => ({ currentUser: jest.fn(), getOpenSession: jest.fn(), login: jest.fn(), logout: jest.fn() }))
jest.mock('@/lib/services/cashRegister', () => ({ openRegister: jest.fn() }))

const wrap = () => render(<NextIntlClientProvider locale="es" messages={messages}><LoginPage /></NextIntlClientProvider>)
const demo = { id: 2, name: 'Mesero Demo', userId: null, pinHash: sha1('123456'), shift: { from: 12, to: 22 } }
const admin = { id: 1, name: 'Administrator', userId: 2, pinHash: null, shift: null }
const hydrateAs = (user: boolean) => { useAuthStore.setState({ hydrated: true, user: user ? { uid: 2, name: 'Admin', companyId: 1, role: 'admin' } : null, session: user ? { id: 16, configId: 1, state: 'opened' } : null, employee: null }) }

beforeEach(() => { push.mockReset(); localStorage.clear(); useAuthStore.setState({ hydrate: async () => undefined }); (listPosEmployees as jest.Mock).mockResolvedValue([demo, admin]) })

// Falla si sin sesión de Odoo el terminal no pide correo y contraseña o pierde el camino del código.
it('without an Odoo session asks the terminal for email and password', async () => {
  hydrateAs(false)
  wrap()
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Inicio de terminal')
  expect(screen.getByRole('button', { name: 'Entrar' })).toBeDisabled()
  await userEvent.click(screen.getByRole('button', { name: '¿Olvidaste tu contraseña?' }))
  expect(screen.getByText('Tengo un código')).toBeInTheDocument()
})

// Falla si con sesión el selector no lista a los empleados con su turno, o si un PIN equivocado entra.
it('with a session lists the employees with today shift and rejects a wrong PIN', async () => {
  hydrateAs(true)
  wrap()
  await waitFor(() => expect(screen.getByRole('button', { name: 'Empleado' })).toHaveTextContent('Mesero Demo'))
  await userEvent.click(screen.getByRole('button', { name: 'Empleado' }))
  const option = screen.getByRole('option', { name: /Mesero Demo/ })
  expect(option).toHaveTextContent('12:00 p. m. – 10:00 p. m.')
  await userEvent.click(option)
  for (const d of '111111') await userEvent.click(screen.getByRole('button', { name: d }))
  await userEvent.click(screen.getByRole('button', { name: 'Iniciar turno' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('PIN incorrecto')
  expect(push).not.toHaveBeenCalled()
})

// Falla si el PIN correcto no inicia el turno (empleado activo) ni lleva al salón.
it('a correct PIN starts the shift and enters the POS', async () => {
  hydrateAs(true)
  useAuthStore.setState({ startShift: async (e) => { useAuthStore.setState({ employee: { id: e.id, name: e.name, checkIn: '', attendanceId: null } }) } })
  wrap()
  await userEvent.click(await screen.findByRole('button', { name: 'Empleado' }))
  await userEvent.click(screen.getByRole('option', { name: /Mesero Demo/ }))
  await act(async () => { for (const d of '123456') window.dispatchEvent(new KeyboardEvent('keydown', { key: d })) })
  await userEvent.click(screen.getByRole('button', { name: 'Iniciar turno' }))
  await waitFor(() => expect(push).toHaveBeenCalledWith('/salon'))
  expect(useAuthStore.getState().employee?.id).toBe(2)
})

// Falla si "¿Olvidaste tu PIN?" no pide el correo ni muestra "Revisa tu correo" con Reenviar y Volver.
it('forgot PIN asks for the email and then shows the check-your-email screen', async () => {
  hydrateAs(true)
  wrap()
  await userEvent.click(await screen.findByRole('button', { name: '¿Olvidaste tu PIN?' }))
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('¿Olvidaste tu PIN?')
  await userEvent.type(screen.getByLabelText('Correo'), 'mesero@x.co')
  await userEvent.click(screen.getByRole('button', { name: 'Solicitar PIN' }))
  expect(await screen.findByRole('heading', { level: 1 })).toHaveTextContent('Revisa tu correo')
  expect(screen.getByText('mesero@x.co')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Reenviar' })).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Volver a iniciar sesión' }))
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Inicio de empleado')
})
