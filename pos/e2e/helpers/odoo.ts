import { expect, type Page } from '@playwright/test'

export async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  const submit = page.getByRole('button', { name: 'Abrir mi turno' })
  // En `next dev` la hidratación puede llegar después del primer relleno y React devuelve los campos a vacío:
  // se rellena de nuevo hasta que el botón queda habilitado.
  await expect(async () => {
    await page.getByLabel('Correo').fill('admin')
    await page.getByLabel('Contraseña').fill('admin')
    await expect(submit).toBeEnabled({ timeout: 1_000 })
  }).toPass({ timeout: 30_000 })
  await submit.click()
  await page.waitForURL('**/salon')
}
