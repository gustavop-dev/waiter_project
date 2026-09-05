import { fireEvent, screen, within } from '@testing-library/react'

import { D4Menu, usualOrder } from '@/components/templates/families/D/D4Menu'
import { entryOf, menuProps, wrap } from '@/components/templates/families/D/__tests__/fixtures'
import type { Account, AccountOrder, Entry } from '@/lib/types'

const mockStore = { entry: null as Entry | null, account: null as Account | null, accountOrders: [] as AccountOrder[], loadAccount: jest.fn() }
jest.mock('@/lib/stores/dinerStore', () => ({ useDinerStore: (sel?: (s: typeof mockStore) => unknown) => (sel ? sel(mockStore) : mockStore) }))

const order = (id: string, fecha: string, lineas: AccountOrder['lineas']): AccountOrder => ({ id, fecha, local: 'Centro', mesa: 14, items: 2, total: 20000, estado: 'pagado', descuento: 0, lineas })
const usual = [{ producto_id: 1, nombre: 'Latte', cantidad: 1, precio: 9000 }, { producto_id: 4, nombre: 'Croissant', cantidad: 2, precio: 5500 }]
const other = [{ producto_id: 2, nombre: 'Cortado', cantidad: 1, precio: 6500 }]
const thisMonth = new Date().toISOString()

beforeEach(() => { mockStore.entry = entryOf(); mockStore.account = null; mockStore.accountOrders = []; mockStore.loadAccount.mockClear() })

// Falla si el habitual no es la combinación más repetida (empate → la más reciente), si no cuenta las veces del mes, o si sin
// pedidos con líneas inventa uno.
it('derives the usual order from the history', () => {
  expect(usualOrder([])).toBeNull()
  expect(usualOrder([order('a', thisMonth, [])])).toBeNull()
  const u = usualOrder([order('a', '2026-07-01T12:00:00Z', other), order('b', thisMonth, usual), order('c', '2026-08-02T12:00:00Z', usual)])
  expect(u).toEqual({ lineas: usual, veces: 2, vecesEsteMes: 1 })
})

// Falla si un comensal sin cuenta no cae directo en el listado estándar con la bienvenida de la marca, si no se pidió la cuenta al
// store, o si el ＋ y la fila no hacen lo suyo.
it('shows the standard list with the brand welcome when there is no account', () => {
  const p = menuProps()
  wrap(<D4Menu {...p} />)
  expect(mockStore.loadAccount).toHaveBeenCalledTimes(1)
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('¿Qué te provoca hoy?')
  expect(screen.getByText('Tinto y Nube')).toHaveClass('uppercase')
  expect(screen.queryByRole('button', { name: 'Pedir igual' })).toBeNull()
  expect(screen.getAllByRole('article')).toHaveLength(5)
  fireEvent.click(screen.getByRole('button', { name: 'Agregar: Cortado' }))
  expect(p.onAdd).toHaveBeenCalledWith(expect.objectContaining({ id: 2 }))
  fireEvent.click(screen.getByText('Latte'))
  expect(p.onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 1 }))
})

// Falla si el cliente reconocido no ve su saludo, el nombre compuesto del habitual, las veces del mes, el precio con la carta de hoy,
// o si «Pedir igual» no agrega cada unidad; y si «Ver toda la carta» no despliega el listado.
it('greets the recognised diner with the usual order and reorders it unit by unit', () => {
  mockStore.account = { id: 'a1', nombre: 'Camila Ruiz', correo: 'c@c.co', verificada: true }
  mockStore.accountOrders = [order('b', thisMonth, usual), order('c', '2026-08-02T12:00:00Z', usual)]
  const p = menuProps()
  wrap(<D4Menu {...p} />)
  expect(mockStore.loadAccount).not.toHaveBeenCalled()
  expect(screen.getByText('Hola de nuevo, Camila Ruiz')).toBeInTheDocument()
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('¿Lo de siempre?')
  expect(screen.getByRole('heading', { level: 2, name: 'Latte + 2 × Croissant' })).toBeInTheDocument()
  expect(screen.getByText('Lo pediste 1 vez este mes.')).toBeInTheDocument()
  expect(screen.getByText('20.000')).toHaveClass('font-t-mono')
  fireEvent.click(screen.getByRole('button', { name: 'Pedir igual' }))
  expect(p.onAdd).toHaveBeenCalledTimes(3)
  expect((p.onAdd as jest.Mock).mock.calls.map((c) => (c[0] as { id: number }).id)).toEqual([1, 4, 4])
  expect(screen.getByText('O cambia algo')).toBeInTheDocument()
  expect(screen.queryByRole('searchbox')).toBeNull()
  const seeAll = screen.getByRole('button', { name: /Ver toda la carta/ })
  fireEvent.click(seeAll)
  expect(seeAll).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByRole('searchbox', { name: 'Buscar un plato' })).toBeInTheDocument()
  expect(within(screen.getByRole('tabpanel')).getAllByRole('article')).toHaveLength(5)
})

// Falla si un habitual cuyos platos ya no están (o están agotados) sigue ofreciéndose en vez de caer al listado.
it('falls back to the list when the usual order is no longer available', () => {
  mockStore.account = { id: 'a1', nombre: 'Camila', correo: 'c@c.co', verificada: true }
  mockStore.accountOrders = [order('b', thisMonth, [{ producto_id: 3, nombre: 'Cold brew', cantidad: 1, precio: 11000 }, { producto_id: 99, nombre: 'Ya no existe', cantidad: 1, precio: 1 }])]
  wrap(<D4Menu {...menuProps()} />)
  expect(screen.queryByRole('button', { name: 'Pedir igual' })).toBeNull()
  expect(screen.getByRole('searchbox')).toBeInTheDocument()
})
