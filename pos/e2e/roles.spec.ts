import { expect, test } from '@playwright/test'

import { loginAs } from './helpers/odoo'

// @flow: waiter-role-limits  @outcome: success
test('a waiter sees only her screens and is sent back to the floor from settings', async ({ page }) => {
  // Sofía es mesera en Odoo (usuario) y empleada con PIN 111111 (hr.employee sembrado en la demo).
  await loginAs(page, 'sofia', 'Waiter-2026', 'Sofía Ríos', '111111')
  await expect(page.getByRole('link', { name: 'Reservas' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Administración' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /\/ Mesero/ })).toBeVisible()
  await page.goto('/configuracion')
  await page.waitForURL('**/salon')
})
