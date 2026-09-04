import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { TableCell } from '@/components/salon/TableCell'
import messages from '@/lib/i18n/messages/es.json'

const wrap = (ui: React.ReactElement) => render(<NextIntlClientProvider locale="es" messages={messages}>{ui}</NextIntlClientProvider>)
const table = { id: 6, number: 9, floorId: 1, seats: 4 }
const NOW = Date.parse('2026-09-04T21:14:00Z')

// Falla si el estado se comunica solo con color: un 8% de los meseros no distingue rojo/verde.
it('renders the state word next to the table number', () => {
  wrap(<TableCell view={{ table, state: 'billing', total: 48800, orderId: 9, startedAt: null, waiter: null }} selected={false} onSelect={jest.fn()} now={NOW} />)
  expect(screen.getByText('9')).toBeInTheDocument()
  expect(screen.getByText('En cuenta')).toBeInTheDocument()
  expect(screen.getByText('48.800')).toHaveClass('font-mono')
})

// Falla si una mesa libre muestra un monto en cero como si tuviera consumo.
it('omits the amount when the table is free', () => {
  wrap(<TableCell view={{ table, state: 'free', total: 0, orderId: null, startedAt: null, waiter: null }} selected={false} onSelect={jest.fn()} now={NOW} />)
  expect(screen.queryByText('0')).toBeNull()
  expect(screen.getByText('4 pax')).toBeInTheDocument()
})

// Falla si una mesa ocupada deja de mostrar el tiempo transcurrido y la barra de 22 min con su avance.
it('shows elapsed time and a progress bar for an occupied table', () => {
  wrap(<TableCell view={{ table, state: 'occupied', total: 74200, orderId: 9, startedAt: '2026-09-04 20:00:00', waiter: 'Alejandra' }} selected={false} onSelect={jest.fn()} now={NOW} />)
  expect(screen.getByText('1:14')).toBeInTheDocument()
  expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
})
