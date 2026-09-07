import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'

import { TableDetailModal } from '@/components/tables/TableDetailModal'
import { messages } from '@/lib/i18n/messages'
import type { OrderDetail, OrderDetailLine } from '@/lib/services/tables'

const line = (id: number, status: OrderDetailLine['status']): OrderDetailLine => ({ id, uuid: `u${id}`, productId: 3, name: `Plato ${id}`, qty: 2, unitPrice: 36900, total: 87822, note: 'Sin cebolla', additions: ['Queso extra'], status })
const detail = (lines: OrderDetailLine[]): OrderDetail => ({ id: 9, tracking: '104', reference: 'Order 9', serviceAt: null, customerName: 'Eva', dateOrder: '2026-09-06 17:24:00', total: 87822, sent: lines.length, served: lines.filter((l) => l.status === 'served').length, lines })
const noop = () => undefined
const wrap = (d: OrderDetail | null, onChangeTable = noop, onPay = noop) => render(
  <NextIntlClientProvider locale="es" messages={messages}>
    <TableDetailModal open onClose={noop} tableName="11" orderId={d ? 9 : null} imageFor={() => null} onChangeTable={onChangeTable} onNewOrder={noop} onPay={onPay} load={async () => d!} />
  </NextIntlClientProvider>,
)

// Falla si con platos en progreso se puede ir a pagar, si desaparece "Cambiar mesa", o si el % ignora lo servido.
it('with dishes in progress: shows the ring, offers change table and keeps payment disabled with the kit notice', async () => {
  const onChangeTable = jest.fn()
  wrap(detail([line(1, 'served'), line(2, 'progress')]), onChangeTable)
  expect(await screen.findByText('DI104')).toBeInTheDocument()
  expect(screen.getByRole('img', { name: '50%' })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Ir a pagar' })).toBeDisabled()
  expect(screen.getByText('Podrás cobrar cuando todos los platos estén servidos.')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Cambiar mesa' }))
  expect(onChangeTable).toHaveBeenCalledWith(expect.objectContaining({ id: 9 }))
})

// Falla si con todo servido sigue sin poderse pagar o si "Cambiar mesa" aparece cuando ya no procede.
it('with everything served: enables payment, hides change table and shows the served summary', async () => {
  const onPay = jest.fn()
  wrap(detail([line(1, 'served'), line(2, 'served')]), noop, onPay)
  expect(await screen.findByText('2 platos')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Cambiar mesa' })).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'Ir a pagar' }))
  expect(onPay).toHaveBeenCalled()
})

// Falla si una línea pierde sus adiciones, su nota, su precio o su cantidad (lo que el mesero lee para servir).
it('lists each dish with status, additions, note, price and quantity', async () => {
  wrap(detail([line(1, 'progress')]))
  const item = (await screen.findByText('Plato 1')).closest('li')!
  expect(item).toHaveTextContent('Adiciones: Queso extra')
  expect(item).toHaveTextContent('Nota: Sin cebolla')
  expect(item).toHaveTextContent('$ 36.900')
  expect(item).toHaveTextContent('x2')
})

it('shows an honest empty state for a table without an open order', () => {
  wrap(null)
  expect(screen.getByText('Sin pedido abierto')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Nuevo pedido' })).toBeEnabled()
})
