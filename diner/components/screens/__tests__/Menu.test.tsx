import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NextIntlClientProvider } from 'next-intl'

import { Menu } from '@/components/screens/Menu'
import messages from '@/lib/i18n/messages/es.json'
import type { Entry } from '@/lib/types'

const mockPush = jest.fn()
const mockAdd = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))
// Ruta relativa a propósito: jest.config.cjs mapea "@/" a <rootDir>/ sin "$1", y jest.mock no pasa por el reescritor de paths de SWC.
jest.mock('../../../lib/stores/dinerStore', () => ({ useDinerStore: () => ({ add: mockAdd }) }))

const brand = { nombre: 'La Provincia', lema: '', logo: null, saludo: '', mesero: '', bienvenida: '', color: '#7A2E2A', colorTexto: '#FFFFFF', colorSuave: '#F6EBEA', fuente: 'Instrument Serif', radio: 14 }
const dish = (id: number, nombre: string, categorias: number[], agotado = false) => ({ id, nombre, precio: 10000 * id, agotado, categorias })
const entradas = { id: 1, nombre: 'Entradas', productos: [dish(1, 'Ají de la casa', [1]), dish(2, 'Empanadas', [1])] }
const fuertes = { id: 2, nombre: 'Fuertes', productos: [dish(3, 'Lomo al trapo', [2]), dish(4, 'Ajiaco', [2], true)] }
const entry: Entry = { contexto: { restaurante: { slug: 'prov', nombre: 'La Provincia' }, sede: { slug: 'centro', nombre: 'Centro' }, mesa: null, marca: brand }, carta: { restaurante: 'prov', categorias: [entradas, fuertes] } }
const wrap = () => render(<NextIntlClientProvider locale="es" messages={messages}><Menu entry={entry} rest="prov" venue="centro" token={null} id={null} /></NextIntlClientProvider>)

beforeEach(() => { mockPush.mockClear(); mockAdd.mockClear() })

// Falla si la búsqueda distingue acentos o mayúsculas, o si no aparece el estado vacío cuando nada coincide.
it('filters dishes by name ignoring accents and case', async () => {
  const user = userEvent.setup()
  wrap()
  expect(screen.getAllByRole('article')).toHaveLength(4)
  await user.type(screen.getByRole('searchbox', { name: 'Buscar un plato' }), 'AJI')
  expect(screen.getAllByRole('article')).toHaveLength(2)
  expect(screen.getByText('Ají de la casa')).toBeInTheDocument()
  expect(screen.getByText('Ajiaco')).toBeInTheDocument()
  await user.type(screen.getByRole('searchbox'), 'zz')
  expect(screen.queryAllByRole('article')).toHaveLength(0)
  expect(screen.getByRole('status')).toHaveTextContent('Nada coincide con tu búsqueda')
})

// Falla si el chip no filtra por categoría, si no se combina con la búsqueda, o si "Todo" no vuelve a la carta completa.
it('filters by category chip and combines it with the search', async () => {
  const user = userEvent.setup()
  wrap()
  await user.click(screen.getByRole('button', { name: 'Fuertes' }))
  expect(screen.getByRole('button', { name: 'Fuertes' })).toHaveAttribute('aria-pressed', 'true')
  expect(screen.getAllByRole('article')).toHaveLength(2)
  expect(screen.queryByText('Empanadas')).toBeNull()
  await user.type(screen.getByRole('searchbox'), 'aji')
  expect(screen.getAllByRole('article')).toHaveLength(1)
  expect(screen.queryByText('Ají de la casa')).toBeNull()
  await user.click(screen.getByRole('button', { name: 'Todo' }))
  expect(screen.getAllByRole('article')).toHaveLength(2)
})

// Falla si tocar la tarjeta no abre el plato o si el ＋ no agrega una unidad sin nota por el store.
it('opens a dish and adds one unit from the card', async () => {
  const user = userEvent.setup()
  wrap()
  await user.click(screen.getByText('Lomo al trapo'))
  expect(mockPush).toHaveBeenCalledWith('/prov/centro/plato/3')
  await user.click(screen.getByRole('button', { name: 'Agregar: Empanadas' }))
  expect(mockAdd).toHaveBeenCalledWith(2, 1, '')
})
