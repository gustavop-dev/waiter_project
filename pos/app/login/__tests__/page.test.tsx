import { fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import LoginPage from '@/app/login/page'
import messages from '@/lib/i18n/messages/es.json'

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))
jest.mock('@/lib/services/odoo', () => ({ jsonRpc: jest.fn().mockResolvedValue({ server_version: '19.0' }), callKw: jest.fn() }))
jest.mock('@/lib/stores/authStore', () => ({ useAuthStore: (sel: (s: { login: jest.Mock }) => unknown) => sel({ login: jest.fn() }) }))
const wrap = (ui: React.ReactElement) => render(<NextIntlClientProvider locale="es" messages={messages}>{ui}</NextIntlClientProvider>)

// Falla si el login muestra la fila de perfiles (fuera por decisión), pierde el saludo o el botón del turno.
it('greets, asks only for email and password, and opens the code flow from "La olvidé"', () => {
  wrap(<LoginPage />)
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/Buen/)
  expect(screen.queryByText('Alejandra')).toBeNull()
  expect(screen.getByRole('button', { name: 'Abrir mi turno' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'La olvidé' }))
  expect(screen.getByText('Tengo un código')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Enviar código' })).toBeDisabled()
})
