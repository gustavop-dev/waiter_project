import { act } from '@testing-library/react'

import { closeOrder, listOpenOrders, payOrder, saveOrder } from '@/lib/services/orders'
import { useOrderStore } from '@/lib/stores/orderStore'

jest.mock('@/lib/services/orders', () => ({ saveOrder: jest.fn(), payOrder: jest.fn(), closeOrder: jest.fn(), listOpenOrders: jest.fn(), getShiftSummary: jest.fn() }))
const mSave = saveOrder as jest.Mock
const mPay = payOrder as jest.Mock
const mClose = closeOrder as jest.Mock
const mList = listOpenOrders as jest.Mock
const angus = { id: 3, templateId: 2, name: 'Angus', price: 36900, categoryIds: [1], taxIds: [5], favorite: false, storable: false, soldOut: false }
const saved = { id: 13, reference: '260-1-000009', state: 'draft' as const, total: 87822, tax: 14022, paid: 0 }

beforeEach(() => {
  jest.clearAllMocks()
  mList.mockResolvedValue([])
  useOrderStore.setState({ draft: null, saved: null, openOrders: [], shift: null, flags: {}, busy: false, error: null })
})

// Falla si enviar a cocina no deja la mesa marcada "en cocina" (el salón no cambiaría de color).
it('sendToKitchen saves the draft and flags the table as sent to kitchen', async () => {
  mSave.mockResolvedValue(saved)
  act(() => { useOrderStore.getState().start(1, 6, 2); useOrderStore.getState().add(angus) })
  await act(() => useOrderStore.getState().sendToKitchen())
  expect(useOrderStore.getState().saved?.total).toBe(87822)
  expect(useOrderStore.getState().flags[6]).toEqual({ sentToKitchen: true })
  expect(useOrderStore.getState().draft?.serverId).toBe(13)
})

// Falla si cobrar paga un monto distinto al total recalculado por Odoo.
it('charge pays the server total with the chosen method and closes the order', async () => {
  mSave.mockResolvedValue(saved); mPay.mockResolvedValue({ ...saved, paid: 87822 }); mClose.mockResolvedValue({ ...saved, state: 'paid', paid: 87822 })
  act(() => { useOrderStore.getState().start(1, 6, 2); useOrderStore.getState().add(angus) })
  await act(() => useOrderStore.getState().charge(1))
  expect(mPay).toHaveBeenCalledWith(13, 1, 87822)
  expect(mClose).toHaveBeenCalledWith(13)
  expect(useOrderStore.getState().draft).toBeNull()
})

// Falla si un error de Odoo deja el store "ocupado" para siempre (botón bloqueado).
it('save surfaces the Odoo message and releases busy', async () => {
  mSave.mockRejectedValue(new Error('Invalid preset'))
  act(() => { useOrderStore.getState().start(1, 6, 2); useOrderStore.getState().add(angus) })
  await act(() => useOrderStore.getState().save())
  expect(useOrderStore.getState()).toMatchObject({ busy: false, error: 'Invalid preset' })
})
