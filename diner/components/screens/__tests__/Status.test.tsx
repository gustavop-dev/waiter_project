import { act, fireEvent, render, screen } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { Status } from '@/components/screens/Status'
import messages from '@/lib/i18n/messages/es.json'
import type { Entry, OrderStatus } from '@/lib/types'

const mockPush = jest.fn()
const mockRefreshOrder = jest.fn().mockResolvedValue(undefined)
const mockCall = jest.fn().mockResolvedValue(true)
let mockOrder: OrderStatus | null = null
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))
// Ruta relativa: el moduleNameMapper de jest.config.cjs ('<rootDir>/' sin $1) no resuelve '@/…' dentro de jest.mock.
jest.mock('../../../lib/stores/dinerStore', () => ({ useDinerStore: () => ({ order: mockOrder, refreshOrder: mockRefreshOrder, call: mockCall }) }))

const brand = { nombre: 'La Provincia', lema: '', logo: null, saludo: '', mesero: 'Alex', bienvenida: '', color: '#7A2E2A', colorTexto: '#FFFFFF', colorSuave: '#F6EBEA', fuente: 'Instrument Serif', radio: 14 }
const entry: Entry = { contexto: { restaurante: { slug: 'la-provincia', nombre: 'La Provincia' }, sede: { slug: 'centro', nombre: 'Centro' }, mesa: { numero: 14, token: '8H2KQ7' }, marca: brand }, carta: { restaurante: 'la-provincia', categorias: [] } }
const base: OrderStatus = { id: 'p1', sesion: 's1', estado: 'en_cocina', total: 83700, impuestos: 0, intentos: 1 }
const status = () => <Status entry={entry} rest="la-provincia" venue="centro" token="8H2KQ7" id="p1" />
const wrap = (ui: React.ReactElement) => render(<NextIntlClientProvider locale="es" messages={messages}>{ui}</NextIntlClientProvider>)

beforeEach(() => { jest.clearAllMocks() })
afterEach(() => { jest.useRealTimers() })

// Falla si la pantalla no pide el pedido por su id, muestra otro estado, pierde los cuatro pasos o el total en mono.
it('fetches the order by id and shows its state, the four steps and the total', () => {
  mockOrder = base
  wrap(status())
  expect(mockRefreshOrder).toHaveBeenCalledWith('p1')
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('En cocina')
  expect(screen.getAllByRole('listitem')).toHaveLength(4)
  expect(screen.getAllByRole('listitem')[1]).toHaveAttribute('aria-current', 'step')
  expect(screen.getByText('$ 83.700')).toHaveClass('font-mono')
  fireEvent.click(screen.getByRole('button', { name: 'Pedir algo más' }))
  expect(mockPush).toHaveBeenCalledWith('/la-provincia/centro/t/8H2KQ7/carta')
})

// Falla si "Llamar al mesero" no pasa por el store, no confirma que alguien viene, o "Pedir la cuenta" no lleva a la cuenta.
it('calls the waiter through the store, confirms it, and offers the bill', async () => {
  mockOrder = { ...base, estado: 'listo' }
  wrap(status())
  fireEvent.click(screen.getByRole('button', { name: 'Llamar al mesero' }))
  expect(mockCall).toHaveBeenCalledTimes(1)
  expect(await screen.findByRole('status')).toHaveTextContent('Listo, ya viene alguien.')
  fireEvent.click(screen.getByRole('button', { name: 'Pedir la cuenta' }))
  expect(mockPush).toHaveBeenCalledWith('/la-provincia/centro/t/8H2KQ7/cuenta')
})

// Falla si un pedido fallido no explica que se conserva, pinta pasos que no existen o no ofrece reintentar desde el carrito.
it('explains a failed order and offers to retry from the cart', () => {
  mockOrder = { ...base, estado: 'fallido', detalle: 'timeout' }
  wrap(status())
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('No se pudo enviar')
  expect(screen.getByText('Tu pedido se conserva. Intenta enviarlo de nuevo.')).toBeInTheDocument()
  expect(screen.queryByRole('list')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Intentar de nuevo' }))
  expect(mockPush).toHaveBeenCalledWith('/la-provincia/centro/t/8H2KQ7/pedido')
})

// Falla si el sondeo no repite cada 8 s mientras el pedido sigue en cocina, o si sigue sondeando ya servido.
it('polls every 8 seconds until the order is served', () => {
  jest.useFakeTimers()
  mockOrder = base
  const { rerender } = wrap(status())
  expect(mockRefreshOrder).toHaveBeenCalledTimes(1)
  act(() => { jest.advanceTimersByTime(16_000) })
  expect(mockRefreshOrder).toHaveBeenCalledTimes(3)
  mockOrder = { ...base, estado: 'servido' }
  rerender(<NextIntlClientProvider locale="es" messages={messages}>{status()}</NextIntlClientProvider>)
  act(() => { jest.advanceTimersByTime(16_000) })
  expect(mockRefreshOrder).toHaveBeenCalledTimes(3)
})

// Falla si el pedido que quedó en el store (otro id) se muestra como si fuera el de la URL.
it('shows loading instead of a stale order from the store', () => {
  mockOrder = { ...base, id: 'otro' }
  wrap(status())
  expect(screen.getByText('Cargando…')).toBeInTheDocument()
  expect(screen.queryByRole('heading', { level: 1 })).toBeNull()
})
