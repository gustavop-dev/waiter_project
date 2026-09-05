import '@/lib/services/__contract__/env'
import { ODOO_LOGIN, ODOO_PASSWORD } from '@/lib/services/__contract__/env'
import { kitchenPhase } from '@/lib/domain/kitchen'
import { addProduct, createDraft } from '@/lib/domain/order'
import { fireUnsentLines, listCourseSummaries, listKitchenTickets, markReady, markServed } from '@/lib/services/kitchen'
import { closeOrder, payOrder, saveOrder } from '@/lib/services/orders'
import { loadPosData } from '@/lib/services/posData'
import { getOpenSession, login } from '@/lib/services/session'

const grill = () => 'Parrilla'

async function openAngusOrder() {
  await login(ODOO_LOGIN, ODOO_PASSWORD)
  const session = (await getOpenSession())!
  const catalog = await loadPosData(session.id)
  const angus = catalog.products.find((p) => p.name.includes('Angus'))!
  const terraza = catalog.floors.find((f) => f.name === 'Terraza')!
  const table = catalog.tables.filter((t) => t.floorId === terraza.id).at(-1)!
  const cash = catalog.paymentMethods.find((m) => m.type === 'cash')!
  const draft = addProduct(addProduct(createDraft({ sessionId: session.id, tableId: table.id, guests: 2 }), angus), angus)
  const saved = await saveOrder(draft)
  const close = async () => { await payOrder(saved.id, cash.id, saved.total); await closeOrder(saved.id) }
  return { session, table, draft: { ...draft, serverId: saved.id }, saved, close }
}

// Falla si el addon projectapp_kitchen no está instalado, si kitchen_fire no pone hora de servidor,
// o si listo/entregado no cambian lo que ve el KDS y el salón.
it('fires a course, shows it in the kitchen, marks it ready and served against the real Odoo', async () => {
  const { session, table, saved, close } = await openAngusOrder()
  const courseId = (await fireUnsentLines(saved.id))!
  expect(await fireUnsentLines(saved.id)).toBeNull()
  const ticket = (await listKitchenTickets(session.id, grill)).find((t) => t.id === courseId)!
  expect(ticket).toMatchObject({ orderId: saved.id, tableId: table.id, lines: [{ qty: 2, station: 'Parrilla', note: '' }] })
  expect(ticket.firedAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/)
  await markReady(courseId)
  expect(kitchenPhase((await listCourseSummaries(session.id)).filter((c) => c.orderId === saved.id))).toBe('ready')
  await markServed(courseId)
  expect((await listKitchenTickets(session.id, grill)).some((t) => t.id === courseId)).toBe(false)
  await close()
})

// Falla si volver a guardar el pedido (sync_from_ui) recrea las líneas y les borra el curso:
// la comanda quedaría vacía en cocina.
it('lines keep their course after the order is synced again', async () => {
  const { session, draft, saved, close } = await openAngusOrder()
  const courseId = (await fireUnsentLines(saved.id))!
  await saveOrder(draft)
  const ticket = (await listKitchenTickets(session.id, grill)).find((t) => t.id === courseId)!
  expect(ticket.lines.map((l) => l.qty)).toEqual([2])
  await markServed(courseId)
  await close()
})
