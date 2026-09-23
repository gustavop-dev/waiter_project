import { render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { Receipt } from '@/components/pay/Receipt'
import { messages } from '@/lib/i18n/messages'
import { resetIssuerCache } from '@/lib/services/issuer'
import { getCompany } from '@/lib/services/settings'
import type { ReceiptData } from '@/lib/stores/orderStore'

jest.mock('@/lib/services/settings', () => ({ getCompany: jest.fn() }))

const data: ReceiptData = {
  company: 'Burger House', tableNumber: 8, reference: 'TA423', at: Date.parse('2026-09-23T05:49:00Z'),
  lines: [{ uuid: 'l1', name: 'Salsa de la casa', qty: 1, unitPrice: 3500, total: 4165 }],
  subtotal: 3500, tax: 665, tip: 0, total: 4165,
  payments: [{ method: 'Efectivo', amount: 4165, reference: '' }], change: 5835,
}

beforeEach(() => {
  resetIssuerCache()
  ;(getCompany as jest.Mock).mockResolvedValue({ id: 1, name: 'Burger House', vat: '900.123.456-7', phone: '(604) 444 5566', email: '', street: 'Cra 43A #5-15', city: 'Medellín' })
})

const show = () => render(<NextIntlClientProvider locale="es" messages={messages}><Receipt data={data} onClose={jest.fn()} /></NextIntlClientProvider>)

// Falla si el papel vuelve a llamarse "comprobante" o recupera el párrafo fiscal largo: el dueño pidió una
// cuenta de cobro con el aviso reducido a una línea (decisión del 2026-09-23).
it('is titled as a cuenta de cobro and carries only the short DIAN note', async () => {
  show()
  expect(await screen.findByLabelText('Cuenta de cobro')).toBeInTheDocument()
  expect(screen.getByText('Documento no validado por la DIAN')).toBeInTheDocument()
  expect(screen.queryByText(/no reemplaza la factura electrónica/)).not.toBeInTheDocument()
})

// Falla si la columna del consumo deja de cuadrar con el subtotal: la línea imprimía el valor CON impuesto
// (4.165) sobre un subtotal SIN impuesto (3.500), así que el papel no sumaba.
it('prints each line without tax so the column adds up to the subtotal', async () => {
  show()
  const doc = await screen.findByLabelText('Cuenta de cobro')
  const shown = [...doc.querySelectorAll('li span')].map((s) => s.textContent)
  expect(shown).toContain('3.500')
  expect(shown).not.toContain('4.165')
  expect(screen.getByText('Subtotal').parentElement).toHaveTextContent('3.500')
})

// Falla si el emisor deja de imprimirse: sin NIT ni dirección el papel no sirve como cuenta de cobro.
it('prints the issuer identification once it is loaded', async () => {
  show()
  expect(await screen.findByText(/900\.123\.456-7/)).toBeInTheDocument()
  expect(screen.getByText(/Cra 43A #5-15/)).toBeInTheDocument()
  expect(screen.getByText('Burger House')).toBeInTheDocument()
})

// Falla si el restaurante no tiene NIT cargado y el documento revienta o miente: debe imprimirse igual.
it('still prints when the restaurant has no tax id yet', async () => {
  ;(getCompany as jest.Mock).mockRejectedValue(new Error('sin permiso'))
  show()
  expect(await screen.findByLabelText('Cuenta de cobro')).toBeInTheDocument()
  expect(screen.getByText('Burger House')).toBeInTheDocument()
})

// Falla si la marca desaparece del papel: el dueño la pidió impresa arriba o abajo, y es tipográfica a
// propósito (un logo ráster sale con bandas en la térmica).
it('closes with the Waiter wordmark', async () => {
  show()
  expect(await screen.findByText('Waiter.')).toBeInTheDocument()
  expect(screen.getByText('by ProjectApp')).toBeInTheDocument()
})
