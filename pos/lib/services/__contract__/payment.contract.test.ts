import '@/lib/services/__contract__/env'
import { ODOO_LOGIN, ODOO_PASSWORD } from '@/lib/services/__contract__/env'
import { addProduct, createDraft } from '@/lib/domain/order'
import { callKw } from '@/lib/services/odoo'
import { addTip, closeOrder, payOrder, saveOrder, setChange } from '@/lib/services/orders'
import { loadPosData } from '@/lib/services/posData'
import { getOpenSession, login } from '@/lib/services/session'

// Falla si la propina no entra como línea sin impuesto, si Odoo rechaza dos pagos sobre un pedido,
// o si el cambio no queda en amount_return.
it('tips, pays with card and cash, records the change and closes against the real Odoo', async () => {
  await login(ODOO_LOGIN, ODOO_PASSWORD)
  const session = (await getOpenSession())!
  const catalog = await loadPosData(session.id)
  const angus = catalog.products.find((p) => p.name.includes('Angus'))!
  const cash = catalog.paymentMethods.find((m) => m.type === 'cash')!
  const card = catalog.paymentMethods.find((m) => m.type === 'bank')!
  const saved = await saveOrder(addProduct(addProduct(createDraft({ sessionId: session.id, tableId: catalog.tables.at(-1)!.id, guests: 2 }), angus), angus))
  // Odoo 19 funde un borrador nuevo con el borrador abierto de la misma mesa: por eso se cierra siempre, pase lo que pase.
  const tipped = await addTip(saved.id, catalog.settings.tipProductId!, 8000)
  await payOrder(saved.id, card.id, 50000)
  await payOrder(saved.id, cash.id, tipped.total - 50000)
  await setChange(saved.id, 2178)
  const closed = await closeOrder(saved.id)
  expect(tipped.total).toBe(saved.total + 8000)
  expect(closed.state).toBe('paid')
  const [row] = await callKw<{ tip_amount: number; amount_return: number; payment_ids: number[] }[]>('pos.order', 'read', [[saved.id], ['tip_amount', 'amount_return', 'payment_ids']])
  expect(row).toMatchObject({ tip_amount: 8000, amount_return: 2178 })
  expect(row.payment_ids).toHaveLength(2)
})
