import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'

import { SettingsModal } from '@/components/kit/SettingsModal'
import { messages } from '@/lib/i18n/messages'
import { changePin, getEmployeeProfile } from '@/lib/services/employees'
import { useAuthStore } from '@/lib/stores/authStore'

jest.mock('@/lib/services/employees', () => ({ getEmployeeProfile: jest.fn(), changePin: jest.fn(async () => undefined), openAttendance: jest.fn(), closeAttendance: jest.fn(), findOpenAttendance: jest.fn(), employeeName: jest.fn() }))
jest.mock('@/lib/services/session', () => ({ currentUser: jest.fn(), getOpenSession: jest.fn(), login: jest.fn(), logout: jest.fn() }))
jest.mock('@/lib/services/cashRegister', () => ({ openRegister: jest.fn() }))

const wrap = (ui: React.ReactElement) => render(<NextIntlClientProvider locale="es" messages={messages}>{ui}</NextIntlClientProvider>)
const modal = (onLogout = async () => undefined) => <SettingsModal open onClose={() => undefined} user={{ name: 'Ana', role: 'admin' }} restaurant="" onLogout={onLogout} />
beforeEach(() => {
  localStorage.clear(); delete document.documentElement.dataset.theme
  useAuthStore.setState({ employee: { id: 2, name: 'Mesero Demo', checkIn: new Date(Date.now() - 65_000).toISOString(), attendanceId: 9 } })
  ;(getEmployeeProfile as jest.Mock).mockResolvedValue({ id: 2, name: 'Mesero Demo', phone: '300', email: null, address: 'Calle 10', joiningDate: '2025-01-01', accessRole: 'waiter', employmentType: 'employee', manager: 'Administrator', shift: { from: 10, to: 14 } })
})

// Falla si la pestaña Empleado no muestra el perfil leído de Odoo con "—" en lo que falta, o si el cronómetro no corre.
it('employee tab shows the profile from Odoo with dashes for missing data and the shift clock', async () => {
  wrap(modal())
  expect(await screen.findByText('Mesero Demo', { selector: 'span' })).toBeInTheDocument()
  expect(screen.getByText('10:00 a. m. – 2:00 p. m.')).toBeInTheDocument()
  expect(screen.getByText('Administrator')).toBeInTheDocument()
  expect(screen.getByText('Mesero')).toBeInTheDocument()
  expect(screen.getAllByText('—')).toHaveLength(1)
  expect(screen.getByTestId('shift-clock')).toHaveTextContent(/00:01:0\d/)
})

// Falla si "Cambiar PIN" no escribe el nuevo PIN en Odoo ni muestra "¡PIN cambiado!".
it('security tab changes the PIN with the keypad and confirms', async () => {
  wrap(modal())
  await userEvent.click(screen.getByRole('tab', { name: 'Seguridad' }))
  await userEvent.click(screen.getByRole('button', { name: 'Cambiar PIN' }))
  for (const d of '654321') await userEvent.click(screen.getByRole('button', { name: d }))
  await userEvent.click(within(screen.getByRole('dialog', { name: 'Cambiar PIN' })).getByRole('button', { name: 'Cambiar PIN' }))
  expect(await screen.findByText('¡PIN cambiado!')).toBeInTheDocument()
  expect(changePin).toHaveBeenCalledWith(2, '654321')
  await userEvent.click(screen.getByRole('button', { name: 'Ok' }))
  expect(screen.queryByText('¡PIN cambiado!')).toBeNull()
})

// Falla si Pantalla pierde el tema oscuro o si la rejilla de idiomas deja elegir uno que no existe todavía.
it('display tab switches the theme and lists the languages with only Spanish enabled', async () => {
  wrap(modal())
  await userEvent.click(screen.getByRole('tab', { name: 'Pantalla' }))
  await userEvent.click(screen.getByRole('radio', { name: 'Oscuro' }))
  expect(document.documentElement.dataset.theme).toBe('dark')
  await userEvent.click(screen.getByRole('button', { name: /Español/ }))
  const grid = screen.getByRole('radiogroup', { name: 'Elige un idioma' })
  expect(grid.querySelectorAll('[role="radio"]')).toHaveLength(11)
  expect(grid.querySelector('[role="radio"][aria-checked="true"]')).toHaveTextContent('Español')
  expect(grid.querySelector('[lang="en"]')).toBeDisabled()
})

// Falla si un toggle de notificaciones no se recuerda en el dispositivo.
it('notification toggles persist locally', async () => {
  wrap(modal())
  await userEvent.click(screen.getByRole('tab', { name: 'Notificaciones' }))
  await userEvent.click(screen.getByRole('switch', { name: 'Novedades de cocina Sonido de notificación' }))
  expect(JSON.parse(localStorage.getItem('waiter.notify') ?? '{}')).toEqual({ 'kitchen.sound': false })
})

// Falla si "Cerrar sesión" sale sin confirmar o si la confirmación no llama a onLogout.
it('logout asks for confirmation before calling onLogout', async () => {
  const onLogout = jest.fn(async () => undefined)
  wrap(modal(onLogout))
  await userEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }))
  expect(onLogout).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('button', { name: 'Sí, salir' }))
  expect(onLogout).toHaveBeenCalled()
})
