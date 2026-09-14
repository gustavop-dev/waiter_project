import { render, screen } from '@testing-library/react'
import PosLayout from '../layout'
import { useAuthStore } from '@/lib/stores/authStore'
import { useCatalogStore } from '@/lib/stores/catalogStore'

const replace = jest.fn()
let pathname = '/inventario'
jest.mock('next/navigation', () => ({ useRouter: () => ({ replace }), usePathname: () => pathname }))
jest.mock('@/lib/stores/authStore', () => ({ useAuthStore: jest.fn() }))
jest.mock('@/lib/stores/catalogStore', () => ({ useCatalogStore: jest.fn() }))
const load = jest.fn()
const auth = { user: { role: 'admin' }, employee: { role: 'admin' }, session: null, hydrated: true, hydrate: jest.fn() }
beforeEach(() => {
  jest.clearAllMocks()
  pathname = '/inventario'
  ;(useAuthStore as unknown as jest.Mock).mockReturnValue(auth)
  ;(useCatalogStore as unknown as jest.Mock).mockImplementation((select) => select({ load, status: 'ready', error: null }))
})
it('allows administrator inventory access with cash closed', () => {
  render(<PosLayout><p>Inventario editable</p></PosLayout>)
  expect(screen.getByText('Inventario editable')).toBeInTheDocument()
  expect(load).toHaveBeenCalledWith(null)
  expect(replace).not.toHaveBeenCalled()
})
it('requires cash for operations even for administrators', () => {
  pathname = '/pedidos/nuevo'
  render(<PosLayout><p>Crear pedido</p></PosLayout>)
  expect(screen.queryByText('Crear pedido')).toBeNull()
  expect(replace).toHaveBeenCalledWith('/caja')
})
it.each(['waiter', 'cashier'])('does not grant closed-cash administration to a %s PIN on an admin terminal', (role) => {
  ;(useAuthStore as unknown as jest.Mock).mockReturnValue({ ...auth, employee: { role } })
  render(<PosLayout><p>Inventario editable</p></PosLayout>)
  expect(screen.queryByText('Inventario editable')).toBeNull()
  expect(replace).toHaveBeenCalledWith('/caja')
})
