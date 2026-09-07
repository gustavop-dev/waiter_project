import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/odoo'

const ODOO = 'http://192.168.56.10:8069'

// Las cuentas abiertas (por ejemplo, las que deja el comensal en sus propias E2E) bloquean el cierre: se cobran antes por la API de Odoo.
async function payOpenBills(request: Parameters<Parameters<typeof test>[2]>[0]['request']) {
  const rpc = async (model: string, method: string, args: unknown[], kwargs = {}) =>
    (await (await request.post(ODOO + '/web/dataset/call_kw', { data: { jsonrpc: '2.0', method: 'call', params: { model, method, args, kwargs } } })).json()).result
  await request.post(ODOO + '/web/session/authenticate', { data: { jsonrpc: '2.0', method: 'call', params: { db: 'projectapp', login: 'admin', password: 'admin' } } })
  const [cash] = await rpc('pos.payment.method', 'search_read', [[['name', '=', 'Efectivo']], ['id']])
  const drafts = await rpc('pos.order', 'search_read', [[['state', '=', 'draft']], ['amount_total', 'amount_paid']])
  for (const d of drafts) {
    await rpc('pos.order', 'add_payment', [[d.id], { pos_order_id: d.id, payment_method_id: cash.id, amount: d.amount_total - d.amount_paid }])
    await rpc('pos.order', 'action_pos_order_paid', [[d.id]])
  }
}

// @flow: register-close-and-open  @outcome: success
test('the cashier closes the register with the counted cash and opens the next shift', async ({ page, request }) => {
  await payOpenBills(request)
  await loginAsAdmin(page)
  await page.goto('/ventas')
  await page.getByRole('button', { name: 'Cerrar caja' }).click()
  const drawer = page.getByRole('dialog', { name: 'Cerrar caja' })
  const expected = (await drawer.getByText(/^\$ /).first().innerText()).replace(/[^\d]/g, '')
  await drawer.getByLabel(/Efectivo contado/).fill(expected)
  await drawer.getByRole('button', { name: 'Cerrar caja' }).click()
  await expect(drawer.getByRole('status')).toHaveText(/Caja cerrada/)
  await page.waitForURL('**/caja')
  await page.getByLabel(/Efectivo inicial/).fill('50000')
  await page.getByRole('button', { name: 'Abrir caja' }).click()
  await page.waitForURL('**/salon')
  await expect(page.getByRole('button', { name: /^1\b.*Libre/ })).toBeVisible()
})
