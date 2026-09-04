import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { TableCell } from '@/components/salon/TableCell'
import messages from '@/lib/i18n/messages/es.json'

const wrap = (ui: React.ReactElement) => render(<NextIntlClientProvider locale="es" messages={messages}>{ui}</NextIntlClientProvider>)
const table = { id: 6, number: 9, floorId: 1, seats: 4 }

// Falla si el estado se comunica solo con color: un 8% de los meseros no distingue rojo/verde.
it('renders the state word next to the table number', () => {
  wrap(<TableCell view={{ table, state: 'billing', total: 48800, orderId: 9 }} selected={false} onSelect={jest.fn()} />)
  expect(screen.getByText('9')).toBeInTheDocument()
  expect(screen.getByText('En cuenta')).toBeInTheDocument()
  expect(screen.getByText('48.800')).toHaveClass('font-mono')
})

// Falla si una mesa libre muestra un monto en cero como si tuviera consumo.
it('omits the amount when the table is free', () => {
  wrap(<TableCell view={{ table, state: 'free', total: 0, orderId: null }} selected={false} onSelect={jest.fn()} />)
  expect(screen.queryByText('0')).toBeNull()
  expect(screen.getByText('4 pax')).toBeInTheDocument()
})
