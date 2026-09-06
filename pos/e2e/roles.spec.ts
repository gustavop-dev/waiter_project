import { expect, test } from '@playwright/test'

// @flow: waiter-role-limits  @outcome: success
test('a waiter sees only her screens and is sent back to the floor from settings', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel('Correo').fill('sofia')
  await page.getByLabel('Contraseña').fill('Waiter-2026')
  await page.getByRole('button', { name: 'Abrir mi turno' }).click()
  await page.waitForURL('**/salon')
  await expect(page.getByRole('link', { name: 'Reservas' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Administración' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /\/ Mesero/ })).toBeVisible()
  await page.goto('/configuracion')
  await page.waitForURL('**/salon')
})
