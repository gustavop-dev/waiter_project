import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/odoo'

// @flow: register-close-and-open  @outcome: success
test('the cashier closes the register with the counted cash and opens the next shift', async ({ page }) => {
  await loginAsAdmin(page)
  await page.goto('/ventas')
  await page.getByRole('button', { name: 'Cerrar caja' }).click()
  const drawer = page.getByRole('complementary', { name: 'Cerrar caja' })
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
