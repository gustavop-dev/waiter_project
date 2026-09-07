import { expect, test } from '@playwright/test'

import { DEMO_EMPLOYEE, loginAs, loginAsAdmin } from './helpers/odoo'

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

// @flow: charge-permission  @outcome: blocked
// Cobrar es configurable: con el permiso apagado, el mesero deja la mesa servida y la cobra la caja.
test('the admin can take charging away from the waiters', async ({ page, browser }) => {
  await loginAsAdmin(page)
  await page.goto('/configuracion')
  await page.getByRole('button', { name: 'Usuarios' }).click()
  const toggle = page.getByRole('switch', { name: 'Los meseros pueden cobrar' })
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'false')

  try {
    // En la tablet de la mesera, la tarjeta ya no ofrece cobrar: lo dice y punto.
    const tablet = await browser.newContext()
    const waiter = await tablet.newPage()
    await loginAs(waiter, 'admin', 'admin')
    await waiter.goto('/pedidos')
    const card = waiter.getByRole('article').first()
    await expect(card).toBeVisible({ timeout: 30_000 })
    await expect(card.getByText('Cobra la caja')).toBeVisible()
    await expect(card.getByRole('link', { name: 'Cobrar' })).toHaveCount(0)
    await tablet.close()
  } finally {
    await page.goto('/configuracion')
    await page.getByRole('button', { name: 'Usuarios' }).click()
    await page.getByRole('switch', { name: 'Los meseros pueden cobrar' }).click()
    await expect(page.getByRole('switch', { name: 'Los meseros pueden cobrar' })).toHaveAttribute('aria-checked', 'true')
  }
})
