import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'

import { PaymentModal } from '@/components/payment/PaymentModal'
import { messages } from '@/lib/i18n/messages'
import { loadLoyaltyProgram, readPayableOrder } from '@/lib/services/paymentKit'
import { useCatalogStore } from '@/lib/stores/catalogStore'
import { useOrderStore } from '@/lib/stores/orderStore'
import type { Catalog } from '@/lib/types'

jest.mock('@/lib/services/paymentKit', () => ({ readPayableOrder: jest.fn(), loadLoyaltyProgram: jest.fn(), lookupMember: jest.fn(), redeemPoints: jest.fn() }))

const order = { id: 40, reference: '260-1-40', trackingNumber: '40', presetId: 1, presetName: 'Dine In', customerName: 'Zahir', tableId: 9, tableNumber: 'A8',
  date: '2026-09-07 12:24:00', total: 100000, tax: 15966, paid: 0, lines: [{ uuid: 'l1', name: 'Hamburguesa Angus', qty: 2, unitPrice: 36900, total: 100000, note: '' }] }
const catalog = { company: { name: 'Aurora' }, settings: { tipProductId: null }, products: [], categories: [], floors: [], tables: [],
  paymentMethods: [{ id: 1, name: 'Efectivo', type: 'cash' }, { id: 2, name: 'Tarjeta', type: 'bank' }] } as unknown as Catalog

beforeEach(() => {
  jest.clearAllMocks()
  ;(readPayableOrder as jest.Mock).mockResolvedValue(order)
  ;(loadLoyaltyProgram as jest.Mock).mockResolvedValue(null)
  useCatalogStore.setState({ catalog, status: 'ready' })
  useOrderStore.setState({ busy: false, error: null, settle: jest.fn().mockResolvedValue(true) as never })
})

const show = (onPaid = jest.fn()) => {
  render(<NextIntlClientProvider locale="es" messages={messages}><PaymentModal orderId={40} onClose={jest.fn()} onPaid={onPaid} /></NextIntlClientProvider>)
  return onPaid
}

// Falla si el efectivo no registra el pago real en Odoo o si el éxito deja de mostrar el cambio.
it('pays cash through orderStore.settle and shows the change', async () => {
  show()
  await userEvent.click(await screen.findByRole('button', { name: '100.000' }))
  await userEvent.click(screen.getByRole('button', { name: 'Pagar ahora' }))
  const settle = useOrderStore.getState().settle as jest.Mock
  expect(settle.mock.calls[0][0]).toEqual({ tip: 0, payments: [{ methodId: 1, type: 'cash', amount: 100000, received: 100000, reference: '' }] })
  expect(settle.mock.calls[0][1]).toMatchObject({ existing: { orderId: 40, tableId: 9 } })
  expect(await screen.findByText('¡Pago exitoso!')).toBeInTheDocument()
  expect(screen.getByText('Efectivo')).toBeInTheDocument()
})

// Falla si sin programa de fidelización la pantalla inventa puntos en vez de decir que no hay programa.
it('says there is no points programme when Odoo has none', async () => {
  show()
  expect(await screen.findByPlaceholderText('Sin programa de puntos')).toBeDisabled()
  expect(screen.getByRole('button', { name: 'Buscar' })).toBeDisabled()
})

// Falla si la pantalla de éxito vuelve a quedarse sin el documento en el DOM: la hoja de impresión solo deja
// visible `.receipt`, así que sin él "Imprimir cuenta" sacaba una hoja en blanco desde Pedidos.
it('mounts the printable cuenta de cobro after charging', async () => {
  const receipt = { company: 'Aurora', tableNumber: 8, reference: 'TA423', at: Date.now(), lines: [],
    subtotal: 84034, tax: 15966, tip: 0, total: 100000, payments: [{ method: 'Efectivo', amount: 100000, reference: '' }], change: 0 }
  useOrderStore.setState({ settle: jest.fn().mockResolvedValue(true) as never, receipt: receipt as never })
  show()
  await userEvent.click(await screen.findByRole('button', { name: '100.000' }))
  await userEvent.click(screen.getByRole('button', { name: 'Pagar ahora' }))
  expect(await screen.findByText('¡Pago exitoso!')).toBeInTheDocument()
  expect(await screen.findByLabelText('Cuenta de cobro')).toBeInTheDocument()
})

// Falla si el documento vuelve a llevar solo el id interno de la mesa en vez del nombre que ve el cliente.
it('sends the table label the customer sees, not just the internal id', async () => {
  show()
  await userEvent.click(await screen.findByRole('button', { name: '100.000' }))
  await userEvent.click(screen.getByRole('button', { name: 'Pagar ahora' }))
  const settle = useOrderStore.getState().settle as jest.Mock
  expect(settle.mock.calls[0][1]).toMatchObject({ tableLabel: 'A8' })
})
