import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { Sidebar } from '@/components/layout/Sidebar'
import messages from '@/lib/i18n/messages/es.json'

const wrap = (ui: React.ReactElement) => render(<NextIntlClientProvider locale="es" messages={messages}>{ui}</NextIntlClientProvider>)

// Falla si un módulo sin pantalla (Ventas, Inventario…) se vuelve navegable y lleva a un 404.
it('renders Operación as the only enabled navigation item', () => {
  wrap(<Sidebar active="operation" />)
  expect(screen.getByRole('link', { name: 'Operación' })).toHaveAttribute('href', '/salon')
  expect(screen.getByRole('button', { name: /Ventas/ })).toBeDisabled()
})
