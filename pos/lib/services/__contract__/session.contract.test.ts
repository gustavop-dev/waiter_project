import '@/lib/services/__contract__/env'
import { ODOO_LOGIN, ODOO_PASSWORD } from '@/lib/services/__contract__/env'
import { getOpenSession, login } from '@/lib/services/session'

// Falla si Odoo cambia la forma de user_companies o si la base configurada no existe.
it('logs in against the real Odoo and finds the open cash session', async () => {
  const user = await login(ODOO_LOGIN, ODOO_PASSWORD)
  expect(user.uid).toBeGreaterThan(0)
  const session = await getOpenSession()
  expect(session).not.toBeNull()
  expect(session?.state).toMatch(/opened|opening_control/)
})
