import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/odoo'

// @flow: order-charged-from-another-device  @outcome: success
// Un dispositivo envía el pedido a cocina; otro (sin borrador local) lo cobra desde el salón.
test('an order sent from one device can be charged from another', async ({ browser }) => {
  const waiter = await browser.newContext()
  const a = await waiter.newPage()
  await loginAsAdmin(a)
  await a.getByRole('button', { name: /^7\b.*Libre/ }).click()
  await a.getByRole('button', { name: 'Abrir pedido' }).click()
  await a.waitForURL('**/mesas/**')
  await a.getByRole('region', { name: 'Carta' }).getByRole('button', { name: /Hamburguesa Angus/ }).click()
  await a.getByRole('button', { name: 'Enviar a cocina' }).click()
  await a.waitForURL('**/salon')
  await waiter.close()

  const cashier = await browser.newContext()
  const b = await cashier.newPage()
  await loginAsAdmin(b)
  await b.getByRole('button', { name: /^7\b.*En cocina/ }).click()
  await expect(b.getByText('Hamburguesa Angus')).toBeVisible()
  await b.getByRole('button', { name: /^Cobrar \$ 43\.911$/ }).click()
  await b.getByRole('button', { name: 'Sí, cobrar' }).click()
  await expect(b.getByRole('button', { name: /^7\b.*Libre/ })).toBeVisible()
  await cashier.close()
})
