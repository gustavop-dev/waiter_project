import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { Sidebar, initials } from '@/components/layout/Sidebar'
import messages from '@/lib/i18n/messages/es.json'

const wrap = (ui: React.ReactElement) => render(<NextIntlClientProvider locale="es" messages={messages}>{ui}</NextIntlClientProvider>)

// Falla si una entrada del sidebar deja de llevar a su pantalla o si el badge de atención no se ve.
it('renders every module as a link and shows badges with counts', () => {
  wrap(<Sidebar active="operation" badges={{ operation: { count: 3, tone: 'brand' }, billing: { count: 1, tone: 'busy' } }} />)
  expect(screen.getByRole('link', { name: /Operación/ })).toHaveAttribute('href', '/salon')
  expect(screen.getByRole('link', { name: /Ventas/ })).toHaveAttribute('href', '/ventas')
  expect(screen.getByRole('link', { name: /Facturación 1/ })).toBeInTheDocument()
})

// Falla si la pantalla de operación en vivo pierde la tarjeta "sin intervención humana" o su porcentaje.
it('shows the autonomy card instead of the shift card when given', () => {
  wrap(<Sidebar active="operation" autonomy={{ autonomous: 86, total: 128 }} shift={{ sales: 1, orders: 1, waiters: 1 }} />)
  expect(screen.getByText('67%')).toHaveClass('font-mono')
  expect(screen.getByText('86 de 128 pedidos hoy')).toBeInTheDocument()
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
