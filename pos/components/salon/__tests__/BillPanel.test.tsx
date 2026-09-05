import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { BillPanel } from '@/components/salon/BillPanel'
import messages from '@/lib/i18n/messages/es.json'

const wrap = (ui: React.ReactElement) => render(<NextIntlClientProvider locale="es" messages={messages}>{ui}</NextIntlClientProvider>)
const table = { id: 6, number: 9, floorId: 1, seats: 4 }
const view = { table, state: 'billing' as const, total: 73600, tax: 11753, orderId: 9, startedAt: '2026-09-04 20:00:00', waiter: 'Alejandra', callSince: null }
const lines = [{ uuid: 'a', productId: 3, name: 'Hamburguesa Angus', unitPrice: 36900, qty: 1, note: '', taxIds: [] }]
const NOW = Date.parse('2026-09-04T21:26:00Z')

// Falla si el total deja de ser el elemento más grande o el botón de cobrar deja de llevar el monto.
it('shows the server total and a charge button carrying the amount', () => {
  wrap(<BillPanel view={view} lines={lines} onCharge={jest.fn()} onOpenOrder={jest.fn()} now={NOW} />)
  expect(screen.getByRole('button', { name: 'Cobrar $ 73.600' })).toHaveClass('h-tap-money', 'bg-brand-500')
})

// Falla si el IVA del servidor no se muestra: "Subtotal + Servicio ≠ Total" confunde al cajero.
it('shows the server tax so the sum adds up to the total', () => {
  wrap(<BillPanel view={view} lines={lines} onCharge={jest.fn()} onOpenOrder={jest.fn()} now={NOW} />)
  expect(screen.getByText('IVA')).toBeInTheDocument()
  expect(screen.getByText('11.753')).toHaveClass('font-mono')
})

// Falla si la cabecera pierde al mesero o el tiempo de la mesa ("4 pax · Alejandra · 1:26 h" en el diseño).
it('shows pax, waiter and elapsed time in the header', () => {
  wrap(<BillPanel view={view} lines={lines} onCharge={jest.fn()} onOpenOrder={jest.fn()} now={NOW} />)
  expect(screen.getByText('4 pax · Alejandra · 1:26 h')).toBeInTheDocument()
})

// Falla si una mesa libre muestra una cuenta en $ 0 con "Cobrar $ 0" en vez de la acción de abrir pedido.
it('offers to open the order instead of a zero bill on a free table', () => {
  wrap(<BillPanel view={{ table, state: 'free', total: 0, tax: 0, orderId: null, startedAt: null, waiter: null, callSince: null }} lines={[]} onCharge={jest.fn()} onOpenOrder={jest.fn()} now={NOW} />)
  expect(screen.getByRole('button', { name: 'Abrir pedido' })).toHaveClass('bg-brand-500')
  expect(screen.queryByText(/Cobrar/)).toBeNull()
})

// Falla si el panel intenta pintar líneas sin mesa seleccionada (crash al abrir el salón).
it('renders the empty hint when no table is selected', () => {
  wrap(<BillPanel view={null} lines={[]} onCharge={jest.fn()} onOpenOrder={jest.fn()} now={NOW} />)
  expect(screen.getByText('Toca una mesa para ver su cuenta')).toBeInTheDocument()
})

it('uses discounted server lines and a subtotal that adds to the server tax and total', () => {
  wrap(<BillPanel view={{ ...view, total: 11305, tax: 1805 }} lines={[{ uuid: 'd', name: 'Plato', qty: 1, unitPrice: 10000, note: '', discount: 5, subtotal: 9500, total: 11305 }]} onCharge={jest.fn()} onOpenOrder={jest.fn()} now={NOW} />)
  expect(screen.getByText('Subtotal').nextSibling).toHaveTextContent('9.500')
  expect(screen.getByText('IVA').nextSibling).toHaveTextContent('1.805')
  expect(screen.getByText('Descuento incluido (antes de IVA)').nextSibling).toHaveTextContent('500')
  expect(screen.getByRole('button', { name: 'Cobrar $ 11.305' })).toBeInTheDocument()
})
