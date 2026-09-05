import '@/lib/services/__contract__/env'
import { ODOO_LOGIN, ODOO_PASSWORD } from '@/lib/services/__contract__/env'
import { addProduct, createDraft } from '@/lib/domain/order'
import { closeOrder, payOrder, saveOrder } from '@/lib/services/orders'
import { loadPosData } from '@/lib/services/posData'
import { getOpenSession, login } from '@/lib/services/session'

// Falla si Odoo deja de recalcular impuestos en servidor o si el cierre no llega a state=paid.
it('creates, prices, pays and closes an order against the real Odoo', async () => {
  await login(ODOO_LOGIN, ODOO_PASSWORD)
  const session = (await getOpenSession())!
  const catalog = await loadPosData(session.id)
  const angus = catalog.products.find((p) => p.name.includes('Angus'))!
  const cash = catalog.paymentMethods.find((m) => m.type === 'cash')!
  const terraza = catalog.floors.find((f) => f.name === 'Terraza')!
  const table = catalog.tables.find((t) => t.floorId === terraza.id)!
  const draft = addProduct(addProduct(createDraft({ sessionId: session.id, tableId: table.id, guests: 2 }), angus), angus)

  const saved = await saveOrder(draft)
  expect(saved.total).toBe(87822)
  const paid = await payOrder(saved.id, cash.id, saved.total)
  expect(paid.paid).toBe(87822)
  const closed = await closeOrder(saved.id)
  expect(closed.state).toBe('paid')
})

// Falla si la nota general a cocina no viaja en sync_from_ui o no la lee el KDS.
it('carries the general kitchen note to Odoo and to the kitchen ticket', async () => {
  const { setOrderNote } = await import('@/lib/domain/order')
  const { fireUnsentLines, listKitchenTickets, markServed } = await import('@/lib/services/kitchen')
  await login(ODOO_LOGIN, ODOO_PASSWORD)
  const session = (await getOpenSession())!
  const catalog = await loadPosData(session.id)
  const angus = catalog.products.find((p) => p.name.includes('Angus'))!
  const cash = catalog.paymentMethods.find((m) => m.type === 'cash')!
  const draft = setOrderNote(addProduct(createDraft({ sessionId: session.id, tableId: catalog.tables[1].id, guests: 2 }), angus), 'alergia al maní en la mesa')
  const saved = await saveOrder(draft)
  const courseId = (await fireUnsentLines(saved.id))!
  const ticket = (await listKitchenTickets(session.id, () => null)).find((t) => t.id === courseId)!
  expect(ticket.note).toBe('alergia al maní en la mesa')
  await markServed(courseId)
  await payOrder(saved.id, cash.id, saved.total)
  await closeOrder(saved.id)
})
