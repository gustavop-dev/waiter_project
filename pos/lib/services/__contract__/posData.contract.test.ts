import '@/lib/services/__contract__/env'
import { ODOO_LOGIN, ODOO_PASSWORD } from '@/lib/services/__contract__/env'
import { loadPosData } from '@/lib/services/posData'
import { getOpenSession, login } from '@/lib/services/session'

// Falla si Odoo renombra un campo de load_data o si la base de referencia perdió su carta.
it('loads a catalog with products, tables and a cash method from the real Odoo', async () => {
  await login(ODOO_LOGIN, ODOO_PASSWORD)
  const session = await getOpenSession()
  const catalog = await loadPosData(session!.id)
  expect(catalog.products.length).toBeGreaterThanOrEqual(5)
  expect(catalog.tables.length).toBeGreaterThanOrEqual(12)
  expect(catalog.paymentMethods.some((m) => m.type === 'cash')).toBe(true)
})
