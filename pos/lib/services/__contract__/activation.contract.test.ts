import '@/lib/services/__contract__/env'
import { ODOO_LOGIN, ODOO_PASSWORD } from '@/lib/services/__contract__/env'
import { activate } from '@/lib/services/activation'
import { callKw } from '@/lib/services/odoo'
import { currentUser, login } from '@/lib/services/session'
import { inviteCodeDryRun } from '@/lib/services/settings'

// Falla si el código no activa la cuenta, si un código vencido/ajeno pasa, o si el usuario no puede entrar después.
it('an invited user activates with the emailed code and logs in', async () => {
  await login(ODOO_LOGIN, ODOO_PASSWORD)
  const email = `activa-${Date.now()}@example.com`
  const id = await callKw<number>('res.users', 'create', [{ name: 'Activación Contrato', login: email, email, waiter_role: 'waiter' }])
  const code = await inviteCodeDryRun(id)
  expect(code).toMatch(/^\d{6}$/)
  expect(await activate(email, '000000', 'Prueba-1234')).toBe(false)
  expect(await activate(email, code, 'Prueba-1234')).toBe(true)
  expect(await activate(email, code, 'Otra-12345')).toBe(false)
  await login(email, 'Prueba-1234')
  expect((await currentUser())?.name).toBe('Activación Contrato')
  await login(ODOO_LOGIN, ODOO_PASSWORD)
  await callKw('res.users', 'write', [[id], { active: false }])
})
