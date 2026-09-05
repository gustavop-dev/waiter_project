import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'

import { Dish } from '@/components/screens/Dish'
import messages from '@/lib/i18n/messages/es.json'
import type { Entry } from '@/lib/types'

const mockPush = jest.fn()
const mockAdd = jest.fn().mockResolvedValue(undefined)
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))
// Ruta relativa a propósito: jest.config.cjs mapea "@/" a <rootDir>/ sin "$1", y jest.mock no pasa por el reescritor de paths de SWC.
jest.mock('../../../lib/stores/dinerStore', () => {
  const useDinerStore = () => ({ add: mockAdd, busy: false })
  useDinerStore.getState = () => ({ error: null })
  return { useDinerStore }
})

const brand = { nombre: 'La Provincia', lema: '', logo: null, saludo: '', mesero: '', bienvenida: '', color: '#7A2E2A', colorTexto: '#FFFFFF', colorSuave: '#F6EBEA', fuente: 'Instrument Serif', radio: 14 }
const lomo = { id: 3, nombre: 'Lomo al trapo', precio: 38900, agotado: false, categorias: [2], descripcion: 'Con papas criollas' }
const ajiaco = { id: 4, nombre: 'Ajiaco', precio: 29000, agotado: true, categorias: [2] }
const entry: Entry = { contexto: { restaurante: { slug: 'prov', nombre: 'La Provincia' }, sede: { slug: 'centro', nombre: 'Centro' }, mesa: null, marca: brand }, carta: { restaurante: 'prov', categorias: [{ id: 2, nombre: 'Fuertes', productos: [lomo, ajiaco] }] } }
const wrap = (id: string | null) => render(<NextIntlClientProvider locale="es" messages={messages}><Dish entry={entry} rest="prov" venue="centro" token={null} id={id} /></NextIntlClientProvider>)

beforeEach(() => { mockPush.mockClear(); mockAdd.mockClear() })

// Falla si la cantidad no sube, si la nota no llega al store, si el total del botón no se recalcula o si no vuelve a la carta.
it('adds two units with a note and goes back to the menu', async () => {
  const user = userEvent.setup()
  wrap('3')
  await user.click(screen.getByRole('button', { name: 'Más' }))
  await user.type(screen.getByRole('textbox', { name: /Nota para la cocina/ }), 'sin cebolla')
  await user.click(screen.getByRole('button', { name: 'Agregar · 77.800' }))
  expect(mockAdd).toHaveBeenCalledWith(3, 2, 'sin cebolla')
  expect(await screen.findByText('Agregado a tu pedido')).toHaveAttribute('role', 'status')
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/prov/centro/carta'), { timeout: 2000 })
})

// Falla si un plato agotado se puede agregar o si la acción principal no dice "Agotado".
it('disables the main action for a sold-out dish', () => {
  wrap('4')
  expect(screen.getByRole('button', { name: 'Agotado' })).toBeDisabled()
  expect(screen.queryByRole('button', { name: /Agregar/ })).toBeNull()
  expect(mockAdd).not.toHaveBeenCalled()
})

// Falla si la cantidad baja de 1 o si el precio (unitario y total) deja de ir en mono.
it('keeps the quantity at one and shows prices in mono', async () => {
  const user = userEvent.setup()
  wrap('3')
  expect(screen.getByRole('button', { name: 'Menos' })).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Menos' }))
  expect(screen.getByRole('button', { name: 'Agregar · 38.900' })).toBeEnabled()
  const prices = screen.getAllByText('38.900')
  expect(prices).toHaveLength(2)
  expect(prices[0]).toHaveClass('font-mono')
  expect(prices[1]).toHaveClass('font-mono')
})

// Falla si un id que no está en la carta rompe la pantalla en vez de avisar y ofrecer volver.
it('shows unavailable with a way back when the dish is not in the menu', async () => {
  const user = userEvent.setup()
  wrap('99')
  expect(screen.getByText('Esta mesa no está disponible')).toBeInTheDocument()
  await user.click(screen.getByRole('button', { name: 'Volver' }))
  expect(mockPush).toHaveBeenCalledWith('/prov/centro/carta')
})
