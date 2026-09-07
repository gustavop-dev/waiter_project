import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/odoo'

// @flow: kit-shell  @outcome: success
// Armazón del kit: barra superior por rol, ajustes con tema oscuro persistente y cierre de sesión con confirmación.
test('top bar, dark theme and logout', async ({ page }) => {
  await loginAsAdmin(page)
  await expect(page.getByRole('link', { name: 'Mesas' })).toHaveAttribute('aria-current', 'page')
  await expect(page.getByRole('link', { name: 'Administración' })).toBeVisible()
  await page.getByRole('link', { name: 'Reservas' }).click()
  await expect(page).toHaveURL(/\/reservas$/)
  await expect(page.getByRole('button', { name: 'Nueva reserva' })).toBeVisible()

  const userChip = page.getByRole('button', { name: /\/ Administrador/ })
  await userChip.click()
  await page.getByRole('tab', { name: 'Pantalla' }).click()
  await page.getByRole('radio', { name: 'Oscuro' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.keyboard.press('Escape')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

  await userChip.click()
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()
  await page.getByRole('button', { name: 'Sí, salir' }).click()
  await expect(page).toHaveURL(/\/login$/)
})
