import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { Sidebar, initials } from '@/components/layout/Sidebar'
import messages from '@/lib/i18n/messages/es.json'

const wrap = (ui: React.ReactElement) => render(<NextIntlClientProvider locale="es" messages={messages}>{ui}</NextIntlClientProvider>)

// Falla si un módulo sin pantalla (Ventas, Inventario…) se vuelve navegable y lleva a un 404.
it('renders Operación as the only enabled navigation item', () => {
  wrap(<Sidebar active="operation" />)
  expect(screen.getByRole('link', { name: 'Operación' })).toHaveAttribute('href', '/salon')
  expect(screen.getByRole('button', { name: /Ventas/ })).toBeDisabled()
})

// Falla si la lateral pierde el nombre del restaurante, las ventas del turno o quién está en caja.
it('shows restaurant, shift sales and the logged-in user', () => {
  wrap(<Sidebar active="operation" restaurant="La Provincia" shift={{ sales: 2890400, orders: 128, waiters: 8 }} userName="Alejandra Castro" />)
  expect(screen.getByText('La Provincia')).toBeInTheDocument()
  expect(screen.getByText('$ 2.890.400')).toHaveClass('font-mono')
  expect(screen.getByText('128 pedidos · 8 meseros')).toBeInTheDocument()
  expect(screen.getByText('AC')).toBeInTheDocument()
})

// Falla si las iniciales del avatar salen mal con un solo nombre o con minúsculas.
it('builds two uppercase initials at most', () => {
  expect([initials('Alejandra Castro'), initials('administrator'), initials('Ana María Ruiz')]).toEqual(['AC', 'A', 'AM'])
})
