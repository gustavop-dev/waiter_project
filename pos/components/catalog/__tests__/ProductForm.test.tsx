import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { ProductForm } from '@/components/catalog/ProductForm'
import { messages } from '@/lib/i18n/messages'

const wrap = (ui: React.ReactElement) => render(<NextIntlClientProvider locale="es" messages={messages}>{ui}</NextIntlClientProvider>)
const initial = { name: 'Angus', price: 36900, categoryIds: [2], taxIds: [55], available: true, storable: false, favorite: false, description: '', dinerAttributes: {} }
const categories = [{ id: 1, name: 'Bebidas', sequence: 1, station: 'Barra' }, { id: 2, name: 'Hamburguesas', sequence: 2, station: 'Parrilla' }]
const taxes = [{ id: 55, name: '19% IVA', amount: 19 }]

// Falla si el formulario guarda el precio como texto, pierde la categoría marcada o no confirma el guardado.
it('edits price and categories and saves them as numbers', async () => {
  const onSave = jest.fn().mockResolvedValue(undefined)
  wrap(<ProductForm initial={initial} isNew={false} categories={categories} taxes={taxes} onSave={onSave} onClose={jest.fn()} />)
  fireEvent.change(screen.getByLabelText(/Precio/), { target: { value: '38900' } })
  fireEvent.click(screen.getByRole('button', { name: 'Bebidas' }))
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  await waitFor(() => expect(onSave).toHaveBeenCalledWith({ ...initial, price: 38900, categoryIds: [2, 1] }))
  expect(await screen.findByRole('status')).toHaveTextContent('Guardado')
})

// Falla si el paso "Atributos" no escribe picante, etiquetas, tamaños o "solo hoy" en diner_attributes.
it('edits the diner attributes in the third step', async () => {
  const onSave = jest.fn().mockResolvedValue(undefined)
  wrap(<ProductForm initial={initial} isNew={false} categories={categories} taxes={taxes} onSave={onSave} onClose={jest.fn()} />)
  fireEvent.click(screen.getByRole('tab', { name: /Atributos/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Medio' }))
  fireEvent.blur(screen.getByLabelText(/Etiquetas/), { target: { value: 'popular, sin gluten' } })
  fireEvent.click(screen.getByRole('button', { name: 'Agregar tamaño' }))
  fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Doble' } })
  fireEvent.click(screen.getByRole('switch', { name: 'Solo hoy' }))
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  await waitFor(() => expect(onSave).toHaveBeenCalledWith({ ...initial, dinerAttributes: { picante: 2, etiquetas: ['popular', 'sin gluten'], tamanos: [{ nombre: 'Doble', precio: 36900 }], soloHoy: true } }))
})
