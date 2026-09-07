import { expect, test } from '@playwright/test'

import { DEMO_EMPLOYEE, loginAs } from './helpers/odoo'

// @flow: waiter-role-limits  @outcome: success
test('a waiter sees only her screens and is sent back to the floor from settings', async ({ page }) => {
  // El usuario de Odoo es mesero; el empleado que se identifica es el demo asignado a este terminal.
  await loginAs(page, 'sofia', 'Waiter-2026', DEMO_EMPLOYEE.name, DEMO_EMPLOYEE.pin)
  await expect(page.getByRole('link', { name: 'Reservas' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Administración' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /\/ Mesero/ })).toBeVisible()
  await page.goto('/configuracion')
  await page.waitForURL('**/salon')
})
