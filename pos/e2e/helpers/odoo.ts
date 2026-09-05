import type { Page } from '@playwright/test'

export async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Correo').fill('admin')
  await page.getByLabel('Contraseña').fill('admin')
  await page.getByRole('button', { name: 'Abrir mi turno' }).click()
  await page.waitForURL('**/salon')
}
