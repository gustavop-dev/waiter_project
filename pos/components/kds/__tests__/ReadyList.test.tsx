import { fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { ReadyList } from '@/components/kds/ReadyList'
import { messages } from '@/lib/i18n/messages'

const wrap = (ui: React.ReactElement) => render(<NextIntlClientProvider locale="es" messages={messages}>{ui}</NextIntlClientProvider>)
const NOW = Date.parse('2026-09-05T02:10:40Z')
const ticket = { id: 8, orderId: 9, tableId: 2, tracking: '125', waiter: 'Julián', note: '', firedAt: '2026-09-05 02:00:00', readyAt: '2026-09-05 02:10:00',
  lines: [{ id: 1, name: 'Costillas BBQ', qty: 1, note: '', station: 'Parrilla', servedAt: null }, { id: 2, name: 'Risotto', qty: 1, note: '', station: null, servedAt: null }] }

// Falla si la tarjeta no dice mesa y platos, o si el tiempo cuenta desde el envío en vez de desde "listo".
it('lists a ready ticket with table, dish count and time since ready, and serves it all on tap', () => {
  const onServed = jest.fn()
  wrap(<ReadyList tickets={[ticket]} tableNumberOf={() => 2} now={NOW} onServed={onServed} onServedDish={jest.fn()} />)
  const card = screen.getByRole('listitem', { name: 'Mesa 2' })
  expect(card).toHaveTextContent('Mesa 2 · 2 platos')
  expect(card).toHaveTextContent('0:40')
  fireEvent.click(screen.getByRole('button', { name: 'Entregar todo' }))
  expect(onServed).toHaveBeenCalledWith(8)
})

// Falla si la cocina no puede entregar un plato suelto: la comanda sale por partes y quien la lleva no
// siempre se lleva todo de una vez.
it('serves one dish at a time and shows the ones already taken', () => {
  const onServedDish = jest.fn()
  const half = { ...ticket, lines: [ticket.lines[0], { ...ticket.lines[1], servedAt: '2026-09-05 02:11:00' }] }
  wrap(<ReadyList tickets={[half]} tableNumberOf={() => 2} now={NOW} onServed={jest.fn()} onServedDish={onServedDish} />)
  // El plato ya entregado no vuelve a ofrecerse y deja de contar como pendiente.
  expect(screen.getByRole('listitem', { name: 'Mesa 2' })).toHaveTextContent('Mesa 2 · 1 plato')
  expect(screen.getAllByRole('button', { name: 'Entregar' })).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: 'Entregar' }))
  expect(onServedDish).toHaveBeenCalledWith(1)
})
