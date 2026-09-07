import { fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { ReadyList } from '@/components/kds/ReadyList'
import { messages } from '@/lib/i18n/messages'

const wrap = (ui: React.ReactElement) => render(<NextIntlClientProvider locale="es" messages={messages}>{ui}</NextIntlClientProvider>)
const NOW = Date.parse('2026-09-05T02:10:40Z')
const ticket = { id: 8, orderId: 9, tableId: 2, tracking: '125', waiter: 'Julián', note: '', firedAt: '2026-09-05 02:00:00', readyAt: '2026-09-05 02:10:00',
  lines: [{ id: 1, name: 'Costillas BBQ', qty: 1, note: '', station: 'Parrilla' }, { id: 2, name: 'Risotto', qty: 1, note: '', station: null }] }

// Falla si la fila no dice mesa y platos, o si el tiempo cuenta desde el envío en vez de desde "listo".
it('lists a ready ticket with table, dish count and time since ready, and serves it on tap', () => {
  const onServed = jest.fn()
  wrap(<ReadyList tickets={[ticket]} tableNumberOf={() => 2} now={NOW} onServed={onServed} />)
  const row = screen.getByRole('button', { name: /Mesa 2 · 2 platos/ })
  expect(row).toHaveTextContent('0:40')
  fireEvent.click(row)
  expect(onServed).toHaveBeenCalledWith(8)
})
