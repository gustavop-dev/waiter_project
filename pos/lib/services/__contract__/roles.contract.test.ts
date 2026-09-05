import '@/lib/services/__contract__/env'
import { ODOO_LOGIN, ODOO_PASSWORD } from '@/lib/services/__contract__/env'
import { callKw } from '@/lib/services/odoo'
import { currentUser, login } from '@/lib/services/session'
import { createUser, setUserRole } from '@/lib/services/settings'

// Falla si el rol no llega al usuario, si cambiarlo no reasigna los grupos de POS de Odoo, o si un mesero
// no puede leer su propio rol al iniciar sesión.
it('creates a cashier, promotes it to admin with the right Odoo groups, and a waiter reads its own role', async () => {
  await login(ODOO_LOGIN, ODOO_PASSWORD)
  const id = await createUser({ name: 'Rol Contrato', login: `rol-${Date.now()}`, password: 'Prueba-1234', role: 'cashier' })
  const groups = async () => (await callKw<{ group_ids: number[] }[]>('res.users', 'read', [[id], ['group_ids']]))[0].group_ids
  const [manager] = await callKw<{ res_id: number }[]>('ir.model.data', 'search_read', [[['module', '=', 'point_of_sale'], ['name', '=', 'group_pos_manager']], ['res_id']])
  expect(await groups()).not.toContain(manager.res_id)
  await setUserRole(id, 'admin')
  expect(await groups()).toContain(manager.res_id)
  await callKw('res.users', 'write', [[id], { active: false }])
  await login('sofia', 'Waiter-2026')
  expect((await currentUser())?.role).toBe('waiter')
  await login(ODOO_LOGIN, ODOO_PASSWORD)
})
