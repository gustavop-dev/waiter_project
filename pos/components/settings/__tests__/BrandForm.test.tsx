import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { BrandForm } from '@/components/settings/BrandForm'
import messages from '@/lib/i18n/messages/es.json'
import { getBrand, getBrandLogo, saveBrand, type BrandInfo } from '@/lib/services/settings'

jest.mock('@/lib/services/settings', () => ({ getBrand: jest.fn(), getBrandLogo: jest.fn(), saveBrand: jest.fn() }))
const mGet = getBrand as jest.Mock
const mLogo = getBrandLogo as jest.Mock
const mSave = saveBrand as jest.Mock
const BRAND: BrandInfo = { companyId: 1, color: '#7A2E2A', font: 'Lora', radius: '14', tagline: 'Cocina de barrio', greeting: '', waiterName: 'Alex', welcome: '', hasLogo: true }
const PNG = 'iVBORw0KGgoAAAANSUhEUg=='

const wrap = () => render(<NextIntlClientProvider locale="es" messages={messages}><BrandForm restaurantName="La Provincia" /></NextIntlClientProvider>)
beforeEach(() => { mGet.mockReset().mockResolvedValue(BRAND); mLogo.mockReset().mockResolvedValue(PNG); mSave.mockReset().mockResolvedValue(undefined) })

// Falla si el formulario no refleja lo guardado en Odoo (color, fuente, redondeo, textos, logo) o pinta el logo como PNG sin serlo.
it('renders the saved brand, its contrast readout and the current logo', async () => {
  wrap()
  expect(await screen.findByLabelText('Código hex')).toHaveValue('#7A2E2A')
  expect(screen.getByLabelText('Tipografía de títulos')).toHaveValue('Lora')
  expect(screen.getByRole('button', { name: 'Suave 14' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getByRole('button', { name: 'Recto 4' })).toHaveAttribute('aria-pressed', 'false')
  expect(screen.getByLabelText(/^Lema/)).toHaveValue('Cocina de barrio')
  expect(screen.getByLabelText(/Nombre del mesero/)).toHaveValue('Alex')
  expect(screen.getByText('Contraste 9.33:1 · texto blanco')).toBeInTheDocument()
  expect(await screen.findByAltText('Logo actual')).toHaveAttribute('src', `data:image/png;base64,${PNG}`)
  expect(mLogo).toHaveBeenCalledWith(1)
  expect(document.getElementById('waiter-brand-fonts')).toHaveAttribute('href', expect.stringContaining('Cormorant+Garamond'))
})

// Falla si un color sin contraste (#808080 queda en 4.49:1) deja guardar, o si la lectura no se actualiza al cambiar el color.
it('updates the contrast readout and blocks saving on a color below 4.5:1', async () => {
  wrap()
  const hex = await screen.findByLabelText('Código hex')
  fireEvent.change(hex, { target: { value: '#808080' } })
  expect(screen.getByRole('alert')).toHaveTextContent('Este color no alcanza 4.5:1 con ningún texto')
  expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
  fireEvent.change(hex, { target: { value: '#2f7a4f' } })
  expect(screen.getByText('Contraste 5.23:1 · texto blanco')).toBeInTheDocument()
  expect(hex).toHaveValue('#2F7A4F')
  expect(screen.getByRole('button', { name: 'Guardar' })).toBeEnabled()
  fireEvent.change(hex, { target: { value: '#7A2E' } })
  expect(screen.getByRole('alert')).toHaveTextContent('Escribe un color como #7A2E2A.')
  expect(screen.getByRole('button', { name: 'Guardar' })).toBeDisabled()
})

// Falla si guardar no manda los valores editados tal cual (sin tocar el logo) o si la pantalla no confirma.
it('saves the edited fields without touching the logo and confirms', async () => {
  wrap()
  fireEvent.change(await screen.findByLabelText(/^Lema/), { target: { value: 'Cocina de barrio E2E' } })
  fireEvent.click(screen.getByRole('button', { name: 'Recto 4' }))
  fireEvent.change(screen.getByLabelText('Tipografía de títulos'), { target: { value: 'Fraunces' } })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  await waitFor(() => expect(mSave).toHaveBeenCalledWith({ ...BRAND, tagline: 'Cocina de barrio E2E', radius: '4', font: 'Fraunces' }, undefined))
  expect(await screen.findByRole('status')).toHaveTextContent('Guardado')
})

// Falla si un Odoo sin los campos brand_* (addon sin actualizar) deja la sección en blanco en vez de avisar.
it('shows the standard error when the brand cannot be read', async () => {
  mGet.mockRejectedValue(new Error('Invalid field brand_color'))
  wrap()
  expect(await screen.findByRole('alert')).toHaveTextContent('No se pudo completar')
  expect(screen.queryByLabelText('Código hex')).not.toBeInTheDocument()
})

// Falla si "Quitar logo" no oculta la imagen ni manda remove al guardar, o si hasLogo no se refresca tras guardar.
it('removes the logo and sends remove on save', async () => {
  wrap()
  await screen.findByAltText('Logo actual')
  fireEvent.click(screen.getByRole('button', { name: 'Quitar logo' }))
  expect(screen.queryByAltText('Logo actual')).not.toBeInTheDocument()
  expect(screen.getByText('Sin logo: se muestra el nombre')).toBeInTheDocument()
  mGet.mockResolvedValue({ ...BRAND, hasLogo: false })
  fireEvent.click(screen.getByRole('button', { name: 'Guardar' }))
  await waitFor(() => expect(mSave).toHaveBeenCalledWith(BRAND, { remove: true }))
  expect(await screen.findByRole('status')).toHaveTextContent('Guardado')
  expect(mGet).toHaveBeenCalledTimes(2)
  expect(screen.queryByRole('button', { name: 'Quitar logo' })).not.toBeInTheDocument()
})
