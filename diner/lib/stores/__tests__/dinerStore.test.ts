/** @jest-environment jsdom */
import { useDinerStore } from '@/lib/stores/dinerStore'
import { ApiError } from '@/lib/services/api'

jest.mock('@/lib/services/api', () => {
  class ApiError extends Error { constructor(message: string, readonly status: number) { super(message) } }
  return {
    ApiError,
    confirmOrder: jest.fn(),
    openSession: jest.fn(),
    getCart: jest.fn(),
    getOrder: jest.fn(), getEntry: jest.fn(), addLine: jest.fn(), updateLine: jest.fn(), removeLine: jest.fn(), callWaiter: jest.fn(), requestBill: jest.fn(),
  }
})

const api = jest.requireMock('@/lib/services/api')
const keys = { rest: 'la-provincia', venue: 'centro', token: 'Z2XUVG' }

// Falla si, cuando el salón ya cobró la cuenta (409), el comensal se queda pegado a la sesión vieja en vez de
// empezar una visita limpia.
test('a 409 on confirm reopens a fresh session and keeps the message for the diner', async () => {
  useDinerStore.setState({ keys, session: { id: 'old' } as never, cart: { lineas: [1] } as never, order: { id: 'p1' } as never })
  api.confirmOrder.mockRejectedValue(new ApiError('La cuenta de esta mesa ya se pagó.', 409))
  api.openSession.mockResolvedValue({ sesion: { id: 'new' } })
  api.getCart.mockResolvedValue({ lineas: [] })

  const result = await useDinerStore.getState().confirm()

  expect(result).toBeNull()
  const state = useDinerStore.getState()
  expect(state.session?.id).toBe('new')
  expect(state.cart).toEqual({ lineas: [] })
  expect(state.order).toBeNull()
  expect(state.error).toMatch(/ya se pagó/)
})

test('other errors do not touch the session', async () => {
  useDinerStore.setState({ keys, session: { id: 'old' } as never })
  api.openSession.mockClear()
  api.confirmOrder.mockRejectedValue(new ApiError('Error 500', 500))
  await useDinerStore.getState().confirm()
  expect(useDinerStore.getState().session?.id).toBe('old')
  expect(api.openSession).not.toHaveBeenCalled()
})
