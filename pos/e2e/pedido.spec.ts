import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/odoo'

// @flow: order-send-and-charge  @outcome: success
test('a waiter opens a table, adds two burgers, sends to kitchen and charges', async ({ page }) => {
  await loginAsAdmin(page)
  await page.getByRole('button', { name: /^3\b.*Libre/ }).click()
  await page.getByText('Toca una mesa para ver su cuenta').waitFor({ state: 'hidden' })
  await page.getByRole('button', { name: /Mesa 3/ }).click()
  // Acotado a la región de la carta: tras el primer toque, la línea del panel también se llama así.
  const carta = page.getByRole('region', { name: 'Carta' })
  await carta.getByRole('button', { name: /Hamburguesa Angus/ }).click()
  await carta.getByRole('button', { name: /Hamburguesa Angus/ }).click()
  await expect(page.getByText('$ 73.800')).toBeVisible()
  await page.getByRole('button', { name: 'Enviar a cocina' }).click()
  await page.waitForURL('**/salon')
  await expect(page.getByRole('button', { name: /^3\b.*En cocina/ })).toBeVisible()
  await page.getByRole('button', { name: /^3\b.*En cocina/ }).click()
  await page.getByRole('button', { name: /^Cobrar \$ 87\.822$/ }).click()
  await page.getByRole('button', { name: 'Sí, cobrar' }).click()
  await expect(page.getByRole('button', { name: /^3\b.*Libre/ })).toBeVisible()
})
