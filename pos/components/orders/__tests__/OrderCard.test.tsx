import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'

import { OrderCard } from '@/components/orders/OrderCard'
import { messages } from '@/lib/i18n/messages'
import type { KitLine, KitOrder } from '@/lib/domain/orderState'

const line = (id: number, name: string, courseId: number | null): KitLine => ({ id, uuid: `u${id}`, productId: 3, name, qty: 2, unitPrice: 36900, subtotal: 73800, total: 87822, note: '', courseId, servedAt: null })
const order: KitOrder = {
  id: 7, number: 'DI007', type: 'dine_in', state: 'draft', tableId: 4, tableNumber: 3, customer: 'Eva', startedAt: '2026-09-06 20:00:00', total: 87822, tax: 14022,
  lines: [line(1, 'Hamburguesa Angus', 1), line(2, 'Papas Trufadas', null)], courses: [{ id: 1, fired: true, readyAt: null, servedAt: null }],
}
const ui = (node: React.ReactNode) => render(<NextIntlClientProvider locale="es" messages={messages}>{node}</NextIntlClientProvider>)

// Falla si la tarjeta pierde el número DI, el tipo, la mesa, el % o el conteo de ítems del kit.
it('renders number, type, table chip, progress and items like the kit card', () => {
  ui(<OrderCard order={order} status="in_progress" percent={50} />)
  expect(screen.getByRole('article', { name: 'Pedido# DI007' })).toHaveTextContent('DI007')
  expect(screen.getByText('En mesa')).toBeInTheDocument()
  expect(screen.getByLabelText('Mesa 3')).toHaveTextContent('3')
  expect(screen.getByRole('img', { name: '50 %' })).toBeInTheDocument()
  expect(screen.getByText('4 ítems')).toBeInTheDocument()
  expect(screen.getByText('$ 87.822', { selector: 'span.font-semibold' })).toBeInTheDocument()
})

// Falla si se puede marcar servida una línea que cocina no recibió, o si "Cobrar" se habilita con líneas sin servir.
it('disables the checkbox of unsent lines and the pay button while something is unserved', async () => {
  const onToggle = jest.fn()
  ui(<OrderCard order={order} status="in_progress" percent={0} onToggleLine={onToggle} />)
  expect(screen.getByRole('checkbox', { name: 'Marcar Papas Trufadas como servido' })).toBeDisabled()
  await userEvent.click(screen.getByRole('checkbox', { name: 'Marcar Hamburguesa Angus como servido' }))
  expect(onToggle).toHaveBeenCalledWith(order.lines[0])
  expect(screen.getByRole('button', { name: 'Cobrar' })).toBeDisabled()
})

// Falla si un pedido totalmente servido no ofrece "Cobrar" como enlace a la pantalla de pago.
it('links to the payment screen when every line is served', () => {
  const served: KitOrder = { ...order, lines: [line(1, 'Hamburguesa Angus', 1)], courses: [{ id: 1, fired: true, readyAt: 'x', servedAt: 'x' }] }
  ui(<OrderCard order={served} status="served" percent={100} />)
  expect(screen.getByRole('link', { name: 'Cobrar' })).toHaveAttribute('href', '/pago/7')
  expect(screen.getByText('Servido')).toBeInTheDocument()
})
