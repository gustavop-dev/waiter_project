import { fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { PayPanel } from '@/components/pay/PayPanel'
import messages from '@/lib/i18n/messages/es.json'

const wrap = (ui: React.ReactElement) => render(<NextIntlClientProvider locale="es" messages={messages}>{ui}</NextIntlClientProvider>)
const methods = [{ id: 1, name: 'Efectivo', type: 'cash' as const }, { id: 2, name: 'Tarjeta', type: 'bank' as const }, { id: 3, name: 'Cuenta de cliente', type: 'pay_later' as const }]

// Falla si el cobro se confirma sin cubrir el total, si el cambio no se calcula, o si "cuenta de cliente" aparece sin cliente.
it('adds a cash payment with change and enables the confirmation only when the bill is covered', () => {
  const onSettle = jest.fn()
  wrap(<PayPanel tableNumber={3} total={87822} lines={[]} methods={methods} busy={false} onSettle={onSettle} onCancel={jest.fn()} />)
  expect(screen.queryByRole('radio', { name: 'Cuenta de cliente' })).toBeNull()
  expect(screen.getByRole('button', { name: 'Confirmar cobro' })).toBeDisabled()
  fireEvent.change(screen.getByLabelText('Recibido en efectivo'), { target: { value: '90000' } })
  fireEvent.click(screen.getByRole('button', { name: 'Agregar pago' }))
  expect(screen.getByText('2.178')).toHaveClass('font-mono')
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar cobro' }))
  expect(onSettle).toHaveBeenCalledWith({ tip: 0, payments: [{ methodId: 1, type: 'cash', amount: 87822, received: 90000, reference: '' }] })
})

// Falla si la propina sugerida no sube el total o si el datáfono cobra sin pasar por la confirmación manual.
it('applies the suggested tip and routes card payments through the manual terminal dialog', () => {
  const onSettle = jest.fn()
  wrap(<PayPanel tableNumber={3} total={100000} lines={[]} methods={methods} busy={false} onSettle={onSettle} onCancel={jest.fn()} />)
  fireEvent.click(screen.getByRole('button', { name: /10 %/ }))
  expect(screen.getByText('$ 110.000')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('radio', { name: 'Datáfono' }))
  fireEvent.click(screen.getByRole('button', { name: 'Agregar pago' }))
  fireEvent.change(screen.getByLabelText(/Voucher/), { target: { value: 'A1B2' } })
  fireEvent.click(screen.getByRole('button', { name: 'Aprobado' }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar cobro' }))
  expect(onSettle).toHaveBeenCalledWith({ tip: 10000, payments: [{ methodId: 2, type: 'bank', amount: 110000, received: 110000, reference: 'A1B2' }] })
})
