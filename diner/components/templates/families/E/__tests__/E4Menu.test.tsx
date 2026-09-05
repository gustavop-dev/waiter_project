import { fireEvent, screen, within } from '@testing-library/react'

import { E4Menu } from '@/components/templates/families/E/E4Menu'
import { cartOf, entryOf, line, menuProps, templateOf, wrap } from '@/components/templates/families/E/__tests__/fixtures'

const mockStore = { account: null as { id: string; nombre: string; correo: string; verificada: boolean } | null }
jest.mock('@/lib/stores/dinerStore', () => ({ useDinerStore: () => mockStore }))

const table = cartOf([
  line({ id: 1, cantidad: 2, subtotal: 28000 }),
  line({ id: 2, producto_id: 6, nombre: 'Papas rústicas', precio: 12000, subtotal: 12000 }),
  line({ id: 3, comensal: 'c-2', mio: false, producto_id: 2, nombre: 'IPA de la casa', precio: 16000, cantidad: 3, subtotal: 48000 }),
  line({ id: 4, comensal: 'c-3', mio: false, producto_id: 4, nombre: 'Humo de páramo', precio: 34000, subtotal: 34000 }),
])

beforeEach(() => { mockStore.account = null })

// Falla si la cabecera no dice mesa y personas (comensales reales del carrito), si cada comensal no tiene su fila con avatar,
// resumen «2 Golden Ale · 1 Papas rústicas» e importe mono, o si la nota de división inventa un reparto.
it('renders the shared bill: table, people, one row per diner with initials and the split note', () => {
  wrap(<E4Menu {...menuProps('E4', { template: templateOf('E4', 'claro'), cart: table })} />)
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Mesa 6 · 3 personas')
  expect(screen.getByText('7 ítems en la mesa')).toBeInTheDocument()
  expect(within(screen.getByRole('banner')).getByText('122.000')).toHaveClass('font-t-mono', 'text-[20px]')
  const rows = within(screen.getByRole('list', { name: 'Mesa 6 · 3 personas' })).getAllByRole('listitem')
  expect(rows).toHaveLength(3)
  expect(rows[0]).toHaveTextContent('2 Golden Ale · 1 Papas rústicas')
  expect(within(rows[0]).getByLabelText('Yo')).toHaveTextContent('Yo')
  expect(within(rows[0]).getByText('40.000')).toHaveClass('font-t-mono')
  expect(within(rows[1]).getByLabelText('Comensal 1')).toHaveClass('bg-kitchen')
  expect(within(rows[2]).getByLabelText('Comensal 2')).toHaveClass('bg-free')
  expect(rows[1]).toHaveClass('bg-t-superficie')
  expect(screen.getByText('La cuenta se divide en 3: 40.667 cada uno.')).toBeInTheDocument()
})

// Falla si con cuenta ligada el avatar no lleva las iniciales del comensal.
it('uses the account initials for my avatar', () => {
  mockStore.account = { id: 'a', nombre: 'Camila Ruiz', correo: 'c@c.co', verificada: true }
  wrap(<E4Menu {...menuProps('E4', { cart: table })} />)
  expect(screen.getByLabelText('Yo')).toHaveTextContent('CR')
})

// Falla si con la mesa vacía se inventan personas o reparto, o si la carta completa no sigue disponible con ＋ y apertura.
it('says nobody ordered yet and still offers the whole menu with ＋ and open', () => {
  const props = menuProps('E4')
  wrap(<E4Menu {...props} />)
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Mesa 6')
  expect(screen.getByText('Nadie ha pedido todavía.')).toBeInTheDocument()
  expect(screen.queryByText(/se divide/)).toBeNull()
  expect(screen.getByRole('button', { name: 'Pagar todo' })).toBeDisabled()
  fireEvent.click(screen.getByRole('button', { name: 'Agregar: Papas rústicas' }))
  expect(props.onAdd).toHaveBeenCalledWith(expect.objectContaining({ id: 6 }))
  fireEvent.click(screen.getByText('Alitas BBQ'))
  expect(props.onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 5 }))
  expect(screen.getByText('2 tamaños · desde 28.000')).toBeInTheDocument()
  expect(screen.queryByRole('button', { name: 'Agregar: Sour de maracuyá' })).toBeNull()
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'ipa' } })
  expect(props.setQuery).toHaveBeenCalledWith('ipa')
  fireEvent.click(screen.getByRole('tab', { name: 'Para picar' }))
  expect(props.setCategory).toHaveBeenCalledWith(3)
})

// Falla si la barra no lleva «Pagar lo mío» / «Dividir en N» al pago y «Pagar todo · total» al pedido.
it('routes the bar actions to pay and to the order with the total', () => {
  wrap(<E4Menu {...menuProps('E4', { cart: table })} />)
  expect(screen.getByRole('link', { name: 'Pagar lo mío' })).toHaveAttribute('href', '/norte/centro/t/Z2XUVG/pago')
  expect(screen.getByRole('link', { name: 'Dividir en 3' })).toHaveAttribute('href', '/norte/centro/t/Z2XUVG/pago')
  const all = screen.getByRole('link', { name: /Pagar todo · \$ 122\.000/ })
  expect(all).toHaveAttribute('href', '/norte/centro/t/Z2XUVG/pedido')
  expect(within(all).getByText('122.000')).toHaveClass('font-t-mono')
})

// Falla si sin mesa (domicilio) la cabecera inventa un número.
it('handles a session without table', () => {
  wrap(<E4Menu {...menuProps('E4', { entry: entryOf(undefined, null) })} />)
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('La mesa')
})
