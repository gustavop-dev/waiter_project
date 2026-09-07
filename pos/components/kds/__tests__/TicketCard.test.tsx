import { fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { TicketCard } from '@/components/kds/TicketCard'
import { messages } from '@/lib/i18n/messages'

const wrap = (ui: React.ReactElement) => render(<NextIntlClientProvider locale="es" messages={messages}>{ui}</NextIntlClientProvider>)
const NOW = Date.parse('2026-09-05T02:18:40Z')
const ticket = { id: 5, orderId: 9, tableId: 3, tracking: '127', waiter: 'Sofía', note: '', firedAt: '2026-09-05 02:00:00', readyAt: null,
  lines: [{ id: 1, name: 'Lomo a la parrilla', qty: 1, note: 'término medio', station: 'Parrilla' , servedAt: null }, { id: 2, name: 'Burrata italiana', qty: 2, note: '', station: 'Fríos' , servedAt: null }] }

// Falla si la tarjeta no se lee a dos metros: cantidad, plato, nota, cronómetro y la etiqueta de demora.
it('renders lines with quantity, note, the timer and the late tag', () => {
  wrap(<TicketCard ticket={ticket} tableNumber={7} now={NOW} onReady={jest.fn()} />)
  expect(screen.getByRole('heading', { name: 'Mesa 7' })).toBeInTheDocument()
  expect(screen.getByText('2×')).toBeInTheDocument()
  expect(screen.getByText(/término medio/)).toBeInTheDocument()
  expect(screen.getByText('18:40')).toHaveClass('font-mono')
  expect(screen.getByText('Demorado')).toBeInTheDocument()
})

// Falla si "Listo" no avisa con el id del curso (cocina marcaría la comanda equivocada).
it('calls onReady with the course id', () => {
  const onReady = jest.fn()
  wrap(<TicketCard ticket={ticket} tableNumber={7} now={NOW} onReady={onReady} />)
  fireEvent.click(screen.getByRole('button', { name: 'Listo' }))
  expect(onReady).toHaveBeenCalledWith(5)
})
