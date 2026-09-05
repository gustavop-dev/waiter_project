import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'

import LoginPage from '@/app/login/page'
import messages from '@/lib/i18n/messages/es.json'
import { useAuthStore } from '@/lib/stores/authStore'

const push = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }))

// Falla si un login correcto no lleva al salón (el mesero se queda en el formulario).
it('navigates to the floor after a successful login', async () => {
  useAuthStore.setState({ login: jest.fn().mockResolvedValue(undefined) })
  render(<NextIntlClientProvider locale="es" messages={messages}><LoginPage /></NextIntlClientProvider>)
  await userEvent.type(screen.getByLabelText('Usuario'), 'admin')
  await userEvent.type(screen.getByLabelText('Contraseña'), 'admin')
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
  await waitFor(() => expect(push).toHaveBeenCalledWith('/salon'))
})
