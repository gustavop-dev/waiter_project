import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { NextIntlClientProvider } from 'next-intl'

import { Cart } from '@/components/screens/Cart'
import messages from '@/lib/i18n/messages/es.json'
import type { Cart as CartData, CartLine, Entry } from '@/lib/types'

const mockPush = jest.fn()
jest.mock('next/navigation', () => ({ useRouter: () => ({ push: mockPush }) }))
const mockStore = { cart: null as CartData | null, busy: false, error: null as string | null, setQty: jest.fn(), remove: jest.fn(), confirm: jest.fn(), refreshCart: jest.fn() }
jest.mock('../../../lib/stores/dinerStore', () => ({ useDinerStore: () => mockStore }))

const brand = { nombre: 'La Provincia', lema: '', logo: null, saludo: '', mesero: 'Alex', bienvenida: '', color: '#7A2E2A', colorTexto: '#FFFFFF', colorSuave: '#F6EBEA', fuente: 'Instrument Serif', radio: 14 }
const entry: Entry = { contexto: { restaurante: { slug: 'la-provincia', nombre: 'La Provincia' }, sede: { slug: 'centro', nombre: 'Centro' }, mesa: { numero: 14, token: '8H2KQ7' }, marca: brand }, carta: { restaurante: 'la-provincia', categorias: [] } }
const line = (over: Partial<CartLine>): CartLine => ({ id: 1, comensal: 'me', mio: true, producto_id: 3, nombre: 'Lomo a la parrilla', precio: 38900, cantidad: 2, nota: '', subtotal: 77800, ...over })
const cartOf = (lineas: CartLine[]): CartData => ({ sesion: 's', lineas, total: lineas.reduce((a, l) => a + l.subtotal, 0), mio: lineas.filter((l) => l.mio).reduce((a, l) => a + l.subtotal, 0), por_comensal: [] })
const tree = () => <NextIntlClientProvider locale="es" messages={messages}><Cart entry={entry} rest="la-provincia" venue="centro" token="8H2KQ7" id={null} /></NextIntlClientProvider>

beforeEach(() => { jest.clearAllMocks(); mockStore.busy = false; mockStore.error = null })

// Falla si lo ajeno se puede editar, si "La mesa" no lo muestra bajo su título, o si los subtotales pierden la fuente mono.
it('renders my lines editable, the others read-only under La mesa, and both subtotals', () => {
  mockStore.cart = cartOf([line({ nota: 'sin cebolla' }), line({ id: 2, comensal: 'other', mio: false, producto_id: 4, nombre: 'Burrata italiana', precio: 32900, cantidad: 1, subtotal: 32900 })])
  render(tree())
  expect(screen.getByRole('heading', { name: 'Tu pedido' })).toHaveClass('font-display')
  expect(screen.getByText(/sin cebolla/)).toHaveClass('text-soft')
  expect(screen.queryByText('Burrata italiana')).toBeNull()
  fireEvent.click(screen.getByRole('tab', { name: 'La mesa' }))
  expect(screen.getByText('Pedido por otros en la mesa').closest('section')).toHaveTextContent('Burrata italiana')
  expect(screen.getAllByRole('button', { name: 'Más' })).toHaveLength(1)
  expect(screen.getByText('$ 77.800')).toHaveClass('font-mono')
  expect(screen.getByText('$ 110.700')).toHaveClass('font-mono')
})

// Falla si "Enviar a cocina" no lleva al estado del pedido devuelto, si no se relee el carrito al entrar, o si se puede tocar dos veces mientras envía.
it('confirms and navigates to the order status with the returned id', async () => {
  mockStore.cart = cartOf([line({})])
  mockStore.confirm.mockResolvedValue('ord-9')
  const { rerender } = render(tree())
  expect(mockStore.refreshCart).toHaveBeenCalledTimes(1)
  fireEvent.click(screen.getByRole('button', { name: /Enviar a cocina · \$ 77\.800/ }))
  await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/la-provincia/centro/t/8H2KQ7/estado/ord-9'))
  mockStore.busy = true
  rerender(tree())
  expect(screen.getByRole('button', { name: 'Enviando…' })).toBeDisabled()
})

// Falla si el stepper no cambia la cantidad de mi línea, o si bajar de 1 deja cantidad 0 en vez de quitar la línea.
it('steps quantity and removes the line when it would drop below one', () => {
  mockStore.cart = cartOf([line({}), line({ id: 5, producto_id: 7, nombre: 'Papas rústicas', precio: 14900, cantidad: 1, subtotal: 14900 })])
  render(tree())
  fireEvent.click(screen.getAllByRole('button', { name: 'Más' })[0])
  expect(mockStore.setQty).toHaveBeenCalledWith(1, 3)
  fireEvent.click(screen.getAllByRole('button', { name: 'Menos' })[0])
  expect(mockStore.setQty).toHaveBeenCalledWith(1, 1)
  fireEvent.click(screen.getAllByRole('button', { name: 'Menos' })[1])
  expect(mockStore.remove).toHaveBeenCalledWith(5)
  expect(mockStore.setQty).not.toHaveBeenCalledWith(5, 0)
  fireEvent.click(screen.getAllByRole('button', { name: 'Quitar' })[0])
  expect(mockStore.remove).toHaveBeenCalledWith(1)
})

// Falla si un carrito vacío ofrece "Enviar a cocina", si "Ver la carta" no lleva a la carta de esta mesa, o si "Volver" pierde el token.
it('shows the empty state with a way back to the menu when nothing was added', () => {
  mockStore.cart = cartOf([])
  render(tree())
  expect(screen.getByText('Todavía no has agregado nada.')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: /Enviar a cocina/ })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Ver la carta' }))
  expect(mockPush).toHaveBeenCalledWith('/la-provincia/centro/t/8H2KQ7/carta')
  expect(screen.getByRole('link', { name: /Volver/ })).toHaveAttribute('href', '/la-provincia/centro/t/8H2KQ7')
})
