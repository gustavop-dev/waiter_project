import { render, screen, waitFor } from '@testing-library/react'
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
  expect(screen.getByRole('button', { name: 'Ir a pagar' })).toHaveAttribute('title', 'Podrás cobrar cuando todos los platos estén servidos.')
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


it('shows an unsent order honestly and can retry its dispatch without leaving the table', async () => {
  const unsent = { ...detail([line(1, 'unsent')]), sent: 0 }
  const load = jest.fn().mockResolvedValue(unsent)
  const send = jest.fn().mockRejectedValueOnce(new Error('Inicia sesión con tu PIN para enviar a cocina.')).mockImplementationOnce(async () => {
    load.mockResolvedValue(detail([line(1, 'waiting')]))
  })
  wrapUnsent()
  function wrapUnsent() {
    render(<NextIntlClientProvider locale="es" messages={messages}>
      <TableDetailModal open onClose={noop} tableName="11" orderId={9} imageFor={() => null}
        onChangeTable={noop} onNewOrder={noop} onPay={noop} load={load} onSendPending={send} />
    </NextIntlClientProvider>)
  }
  const button = await screen.findByRole('button', { name: 'Enviar pendientes a cocina' })
  expect(screen.getAllByText('Sin enviar a cocina')).toHaveLength(2)
  expect(screen.queryByText(/En progreso/)).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Ir a pagar' })).toBeDisabled()
  await userEvent.click(button)
  expect(await screen.findByRole('alert')).toHaveTextContent('Inicia sesión con tu PIN')
  expect(button).toBeEnabled()
  await userEvent.click(button)
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Enviar pendientes a cocina' })).not.toBeInTheDocument())
  expect(send).toHaveBeenNthCalledWith(2, 9)
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})


it('delivers all ready dishes from the detail and immediately refreshes their status', async () => {
  const load = jest.fn().mockResolvedValue(detail([line(1, 'ready'), line(2, 'ready')]))
  const serve = jest.fn().mockImplementation(async () => { load.mockResolvedValue(detail([line(1, 'served'), line(2, 'served')])) })
  render(<NextIntlClientProvider locale="es" messages={messages}>
    <TableDetailModal open onClose={noop} tableName="11" orderId={9} imageFor={() => null}
      onChangeTable={noop} onNewOrder={noop} onPay={noop} load={load} onServe={serve} />
  </NextIntlClientProvider>)
  await userEvent.click(await screen.findByRole('button', { name: 'Entregar todo' }))
  expect(serve).toHaveBeenCalledWith([expect.objectContaining({ id: 1 }), expect.objectContaining({ id: 2 })])
  await waitFor(() => expect(screen.getByRole('button', { name: 'Ir a pagar' })).toBeEnabled())
  expect(screen.queryByRole('button', { name: 'Entregar todo' })).not.toBeInTheDocument()
})

it('shows and attends calls even when a table has no order', async () => {
  const attend = jest.fn().mockResolvedValue(undefined)
  render(<NextIntlClientProvider locale="es" messages={messages}>
    <TableDetailModal open onClose={noop} tableName="11" orderId={null} imageFor={() => null}
      onChangeTable={noop} onNewOrder={noop} onPay={noop} call={{ tableId: 11, kind: 'assist', since: '' }} onAttendCall={attend} />
  </NextIntlClientProvider>)
  expect(screen.getByText('Solicita un mesero')).toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Marcar atendida' }))
  expect(attend).toHaveBeenCalledTimes(1)
})
