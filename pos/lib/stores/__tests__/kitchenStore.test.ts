import { act } from '@testing-library/react'

import { chime } from '@/lib/audio/chime'
import { listCompletedCourses, listKitchenTickets, markReady } from '@/lib/services/kitchen'
import { useKitchenStore } from '@/lib/stores/kitchenStore'

jest.mock('@/lib/services/kitchen', () => ({ listKitchenTickets: jest.fn(), listCompletedCourses: jest.fn(), markReady: jest.fn(), markServed: jest.fn() }))
jest.mock('@/lib/audio/chime', () => ({ chime: jest.fn() }))
const mTickets = listKitchenTickets as jest.Mock
const ticket = (id: number) => ({ id, orderId: id, tableId: 1, tracking: '1', waiter: '', firedAt: '2026-09-05 02:00:00', readyAt: null, lines: [] })
const none = () => null

beforeEach(() => {
  jest.clearAllMocks()
  ;(listCompletedCourses as jest.Mock).mockResolvedValue([])
  useKitchenStore.setState({ tickets: [], done: [], tab: 'all', muted: false, primed: false, error: null })
})

// Falla si el aviso suena al abrir la pantalla, o si no suena cuando entra una comanda nueva.
it('chimes only for tickets that appear after the first load', async () => {
  mTickets.mockResolvedValueOnce([ticket(1)]).mockResolvedValueOnce([ticket(1), ticket(2)])
  await act(() => useKitchenStore.getState().refresh(4, none))
  expect(chime).not.toHaveBeenCalled()
  await act(() => useKitchenStore.getState().refresh(4, none))
  expect(chime).toHaveBeenCalledTimes(1)
  expect(useKitchenStore.getState().tickets).toHaveLength(2)
})

// Falla si "Listo" no llega a Odoo o si la pantalla no se refresca después.
it('marks a course ready in Odoo and refreshes the board', async () => {
  mTickets.mockResolvedValue([])
  await act(() => useKitchenStore.getState().ready(5, 4, none))
  expect(markReady).toHaveBeenCalledWith(5)
  expect(mTickets).toHaveBeenCalledWith(4, none)
})
