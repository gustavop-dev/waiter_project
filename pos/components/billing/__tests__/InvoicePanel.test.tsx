import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { InvoicePanel } from '@/components/billing/InvoicePanel'
import { messages } from '@/lib/i18n/messages'

jest.mock('@/lib/services/invoices', () => ({ orderLines: jest.fn().mockResolvedValue([{ id: 1, name: 'Hamburguesa Angus', qty: 2, unit: 36900, total: 73800 }]), invoicePdfUrl: (id: number) => `/pdf/${id}` }))
jest.mock('@/lib/services/customers', () => ({ listCustomers: jest.fn().mockResolvedValue([{ id: 7, name: 'Eva Martínez', vat: '1020' }]) }))

const wrap = (ui: React.ReactElement) => render(<NextIntlClientProvider locale="es" messages={messages}>{ui}</NextIntlClientProvider>)
const order = { id: 12, reference: 'P12', date: '2026-09-05 20:00:00', total: 92000, tax: 14022, tableId: 5, partnerId: null, partnerName: '', invoiceId: null }

// Falla si el panel no pinta las líneas y los totales del pedido, o si emite la factura sin el cliente elegido.
it('shows the order lines and totals, issues the invoice for the chosen customer and offers the PDF', async () => {
  const onIssue = jest.fn().mockResolvedValue({ id: 3, name: 'INV/2026/00003' })
  wrap(<InvoicePanel selection={{ kind: 'order', order }} tableNumber={5} onIssue={onIssue} />)
  expect(await screen.findByText('Hamburguesa Angus')).toBeInTheDocument()
  expect(screen.getByText('$ 73.800')).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /Emitir factura/ })).toBeDisabled()
  fireEvent.click(await screen.findByRole('radio', { name: /Eva Martínez/ }))
  fireEvent.click(screen.getByRole('button', { name: /Emitir factura/ }))
  await waitFor(() => expect(onIssue).toHaveBeenCalledWith(12, 7))
  expect(await screen.findByRole('status')).toHaveTextContent('INV/2026/00003')
  expect(screen.getByRole('link', { name: /Ver PDF/ })).toHaveAttribute('href', '/pdf/3')
})

// Falla si una factura ya emitida pierde su estado, su total o el enlace al PDF.
it('shows an issued invoice with its state pills and the PDF link', () => {
  wrap(<InvoicePanel selection={{ kind: 'invoice', invoice: { id: 3, name: 'INV/2026/00003', date: '2026-09-05', partner: 'Eva Martínez', total: 87822, state: 'posted', paymentState: 'paid' } }} tableNumber={null} onIssue={jest.fn()} />)
  expect(screen.getByText('Emitida')).toBeInTheDocument()
  expect(screen.getByText('Pagada')).toBeInTheDocument()
  expect(screen.getByText('$ 87.822')).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /Ver PDF/ })).toHaveAttribute('href', '/pdf/3')
})
