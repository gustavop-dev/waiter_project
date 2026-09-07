import { expect, test } from '@playwright/test'

import { createOrder, DEMO_EMPLOYEE, loginAs, startShiftAs } from './helpers/odoo'

// @flow: kit-serve-dish  @outcome: success
// Marcar un plato lo sirve en Odoo, no solo en esta tablet: se comprueba recargando la pantalla.
test('marcar un plato lo deja servido y sobrevive a la recarga', async ({ page }) => {
  await loginAs(page, 'admin', 'admin')
  const customer = `Servido ${Date.now().toString().slice(-6)}`

  await createOrder(page, { customer })

  const card = page.getByRole('article').filter({ hasText: customer })
  const dish = card.getByRole('checkbox').first()
  await expect(dish).toBeEnabled()
  // click, no check: al marcarlo la lista se recarga y el elemento se sustituye por el servido.
  await dish.click()
  await expect(card.getByRole('checkbox').first()).toBeDisabled({ timeout: 20_000 })

  // La prueba de verdad: el servidor lo guardó, no la memoria de la tablet.
  await page.reload()
  const again = page.getByRole('article').filter({ hasText: customer }).getByRole('checkbox').first()
  await expect(again).toBeChecked()
  await expect(again).toBeDisabled()
})

// @flow: kit-role-follows-employee  @outcome: success
// Con la tablet abierta como administrador, quien manda es el empleado que marcó su PIN.
test('un mesero en una tablet de administrador solo ve sus pestañas', async ({ page }) => {
  await page.goto('/login')
  const submit = page.getByRole('button', { name: /Entrar|Abrir mi turno/ })
  await expect(async () => {
    await page.getByLabel('Correo').fill('admin')
    await page.getByLabel('Contraseña').fill('admin')
    await expect(submit).toBeEnabled({ timeout: 1_000 })
  }).toPass({ timeout: 30_000 })
  await submit.click()
  await startShiftAs(page, DEMO_EMPLOYEE.name, DEMO_EMPLOYEE.pin)
  await page.waitForURL('**/salon')

  await expect(page.getByRole('button', { name: `${DEMO_EMPLOYEE.name} / Mesero` })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Administración' })).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Cocina' })).toHaveCount(0)
  await page.goto('/configuracion')
  await page.waitForURL('**/salon')
})
