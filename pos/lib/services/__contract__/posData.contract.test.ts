import '@/lib/services/__contract__/env'
import { ODOO_LOGIN, ODOO_PASSWORD } from '@/lib/services/__contract__/env'
import { loadPosData } from '@/lib/services/posData'
import { getOpenSession, login } from '@/lib/services/session'

// Falla si Odoo mueve impuestos o categorías fuera de product.template, o si floor_id cambia de forma:
// asserta VALORES, no conteos, porque un conteo dejó pasar un mapeo roto.
it('loads a catalog whose products carry taxes and categories and whose tables point to real floors', async () => {
  await login(ODOO_LOGIN, ODOO_PASSWORD)
  const session = await getOpenSession()
  const c = await loadPosData(session!.id)
  const angus = c.products.find((p) => p.name.includes('Angus'))!
  expect(angus.taxIds.length).toBeGreaterThanOrEqual(1)
  expect(angus.categoryIds.length).toBeGreaterThanOrEqual(1)
  const floorIds = new Set(c.floors.map((f) => f.id))
  expect(c.tables.every((t) => floorIds.has(t.floorId))).toBe(true)
  expect(c.paymentMethods.some((m) => m.type === 'cash')).toBe(true)
})
