import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { ProductForm } from '@/components/catalog/ProductForm'
import messages from '@/lib/i18n/messages/es.json'

const wrap = (ui: React.ReactElement) => render(<NextIntlClientProvider locale="es" messages={messages}>{ui}</NextIntlClientProvider>)
const initial = { name: 'Angus', price: 36900, categoryIds: [2], taxIds: [55], available: true, storable: false, favorite: false, description: '' }
const categories = [{ id: 1, name: 'Bebidas', sequence: 1, station: 'Barra' }, { id: 2, name: 'Hamburguesas', sequence: 2, station: 'Parrilla' }]

// Falla si el formulario guarda el precio como texto, pierde la categoría marcada o no confirma el guardado.
it('edits price and categories and saves them as numbers', async () => {
  const onSave = jest.fn().mockResolvedValue(undefined)
  wrap(<ProductForm initial={initial} isNew={false} categories={categories} taxes={[{ id: 55, name: '19% IVA', amount: 19 }]} onSave={onSave} onClose={jest.fn()} />)
  fireEvent.change(screen.getByLabelText(/Precio/), { target: { value: '38900' } })
  fireEvent.click(screen.getByRole('button', { name: 'Bebidas' }))
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  await waitFor(() => expect(onSave).toHaveBeenCalledWith({ ...initial, price: 38900, categoryIds: [2, 1] }))
  expect(await screen.findByRole('status')).toHaveTextContent('Guardado')
})
