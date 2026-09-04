import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { BillPanel } from '@/components/salon/BillPanel'
import messages from '@/lib/i18n/messages/es.json'

const wrap = (ui: React.ReactElement) => render(<NextIntlClientProvider locale="es" messages={messages}>{ui}</NextIntlClientProvider>)
const view = { table: { id: 6, number: 9, floorId: 1, seats: 4 }, state: 'billing' as const, total: 73600, orderId: 9 }
const lines = [{ uuid: 'a', productId: 3, name: 'Hamburguesa Angus', unitPrice: 36900, qty: 1, note: '', taxIds: [] }]

// Falla si el total deja de ser el elemento más grande o el botón de cobrar deja de llevar el monto.
it('shows the server total and a charge button carrying the amount', () => {
  wrap(<BillPanel view={view} lines={lines} onCharge={jest.fn()} onOpenOrder={jest.fn()} />)
  expect(screen.getByRole('button', { name: 'Cobrar $ 73.600' })).toHaveClass('h-tap-money', 'bg-brand-500')
})

// Falla si el panel intenta pintar líneas sin mesa seleccionada (crash al abrir el salón).
it('renders the empty hint when no table is selected', () => {
  wrap(<BillPanel view={null} lines={[]} onCharge={jest.fn()} onOpenOrder={jest.fn()} />)
  expect(screen.getByText('Toca una mesa para ver su cuenta')).toBeInTheDocument()
})
