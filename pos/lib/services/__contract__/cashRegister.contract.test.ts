import '@/lib/services/__contract__/env'
import { ODOO_LOGIN, ODOO_PASSWORD } from '@/lib/services/__contract__/env'
import { cashInOut, closeRegister, closingData, openRegister } from '@/lib/services/cashRegister'
import { callKw } from '@/lib/services/odoo'
import { closeOrder, payOrder } from '@/lib/services/orders'
import { loadPosData } from '@/lib/services/posData'
import { getOpenSession, login } from '@/lib/services/session'

// Falla si Odoo no acepta el arqueo (efectivo contado), si el cierre no valida, o si no se puede abrir la caja siguiente.
it('closes the register with the counted cash and opens the next shift against the real Odoo', async () => {
  await login(ODOO_LOGIN, ODOO_PASSWORD)
  const session = (await getOpenSession())!
  const catalog = await loadPosData(session.id)
  const cash = catalog.paymentMethods.find((m) => m.type === 'cash')!
  // Las cuentas abiertas bloquean el cierre: se cobran (son datos de demo).
  const drafts = await callKw<{ id: number; amount_total: number; amount_paid: number }[]>('pos.order', 'search_read', [[['session_id', '=', session.id], ['state', '=', 'draft']], ['amount_total', 'amount_paid']])
  for (const d of drafts) { await payOrder(d.id, cash.id, d.amount_total - d.amount_paid); await closeOrder(d.id) }
  await cashInOut(session.id, 'out', 1000, 'contrato')
  const before = await closingData(session.id)
  expect(before.draftOrders).toBe(0)
  expect(before.cashMoves.map((m) => m.amount)).toContain(-1000)
  const result = await closeRegister(session.id, before.expectedCash, 'cierre de contrato')
  expect(result.successful).toBe(true)
  const next = await openRegister(catalog.settings.configId, 50000, 'apertura de contrato')
  expect((await getOpenSession())?.id).toBe(next.id)
  expect((await closingData(next.id)).openingCash).toBe(50000)
})
