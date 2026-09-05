import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { CloseRegisterDrawer } from '@/components/cash/CloseRegisterDrawer'
import messages from '@/lib/i18n/messages/es.json'

const wrap = (ui: React.ReactElement) => render(<NextIntlClientProvider locale="es" messages={messages}>{ui}</NextIntlClientProvider>)
const data = { ordersCount: 44, ordersTotal: 3531687, expectedCash: 3401687, openingCash: 0, cashPayments: 3401687, cashMoves: [], otherMethods: [{ id: 2, name: 'Tarjeta', amount: 130000, count: 3 }], draftOrders: 0, openingNotes: '' }

// Falla si se puede cerrar con cuentas abiertas, si la diferencia no se calcula, o si el cierre no llega con lo contado.
it('computes the difference, blocks with open bills and closes with the counted cash', async () => {
  const onConfirm = jest.fn().mockResolvedValue({ successful: true, message: '' })
  const { rerender } = wrap(<CloseRegisterDrawer data={{ ...data, draftOrders: 2 }} onClose={jest.fn()} onConfirm={onConfirm} />)
  expect(screen.getByRole('alert')).toHaveTextContent('Hay 2 cuentas abiertas')
  rerender(<NextIntlClientProvider locale="es" messages={messages}><CloseRegisterDrawer data={data} onClose={jest.fn()} onConfirm={onConfirm} /></NextIntlClientProvider>)
  fireEvent.change(screen.getByLabelText(/Efectivo contado/), { target: { value: '3391687' } })
  expect(screen.getByText('-10.000')).toHaveClass('text-busy-ink')
  fireEvent.click(screen.getByRole('button', { name: 'Cerrar caja' }))
  await waitFor(() => expect(onConfirm).toHaveBeenCalledWith(3391687, ''))
  expect(await screen.findByRole('status')).toHaveTextContent('Caja cerrada')
})
