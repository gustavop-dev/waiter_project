import { expect, test } from '@playwright/test'

import { chargeTable, createOrder, kitchenReadyAndServe, loginAsAdmin } from './helpers/odoo'

// @flow: order-charged-from-another-device  @outcome: success
// El pedido vive en Odoo, no en la tablet que lo tomó: un dispositivo lo crea y lo entrega, se apaga, y otro
// —sin borrador local ni memoria de nada— lo encuentra en el plano y lo cobra.
test('an order sent from one device can be charged from another', async ({ browser }) => {
  const waiter = await browser.newContext()
  const a = await waiter.newPage()
  await loginAsAdmin(a)
  const customer = `Remoto ${Date.now().toString().slice(-6)}`
  const mesa = await createOrder(a, { customer })
  await kitchenReadyAndServe(a, mesa)
  await waiter.close()

  const cashier = await browser.newContext()
  const b = await cashier.newPage()
  await loginAsAdmin(b)
  await b.goto('/salon')
  await expect(b.getByRole('button', { name: new RegExp(`^Mesa ${mesa}: Servido`) })).toBeVisible({ timeout: 30_000 })
  await b.getByRole('button', { name: new RegExp(`^Mesa ${mesa}: `) }).click()
  await b.getByRole('button', { name: 'Detalle de mesa' }).click()
  await expect(b.getByRole('dialog', { name: 'Detalle de mesa' })).toContainText(customer)
  await b.getByRole('button', { name: 'Cerrar' }).click()
  await chargeTable(b, mesa)
  await cashier.close()
})
