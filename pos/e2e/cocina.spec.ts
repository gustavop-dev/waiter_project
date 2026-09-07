import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/odoo'

// @flow: kitchen-ready-served  @outcome: success
test('kitchen marks a ticket ready and served; the salon shows it served and charges it', async ({ page }) => {
  await loginAsAdmin(page)
  await page.getByRole('button', { name: /^Mesa 5: Disponible/ }).click()
  await page.getByText('Toca una mesa para ver su cuenta').waitFor({ state: 'hidden' })
  await page.getByRole('button', { name: /Mesa 5/ }).click()
  const carta = page.getByRole('region', { name: 'Carta' })
  await carta.getByRole('button', { name: /Hamburguesa Angus/ }).click()
  await carta.getByRole('button', { name: /Hamburguesa Angus/ }).click()
  await page.getByRole('button', { name: 'Enviar a cocina' }).click()
  await page.waitForURL('**/salon')
  await expect(page.getByRole('button', { name: /^Mesa 5: En progreso/ })).toBeVisible()

  await page.goto('/kds')
  const ticket = page.getByRole('article', { name: 'Mesa 5' })
  await expect(ticket).toContainText('Hamburguesa Angus')
  await ticket.getByRole('button', { name: 'Listo' }).click()
  const ready = page.getByRole('complementary', { name: 'Listos por entregar' })
  await ready.getByRole('button', { name: /Mesa 5 · 2 platos/ }).click()
  await expect(ready.getByRole('button', { name: /Mesa 5/ })).toHaveCount(0)

  await page.goto('/salon')
  await page.getByRole('button', { name: /^Mesa 5: Servido/ }).click()
  await page.getByRole('button', { name: /^Cobrar \$ 87\.822$/ }).click()
  await page.getByRole('button', { name: 'Agregar pago' }).click()
  await page.getByRole('button', { name: 'Confirmar cobro' }).click()
  await page.getByRole('button', { name: 'Cerrar' }).click()
  await expect(page.getByRole('button', { name: /^Mesa 5: Disponible/ })).toBeVisible()
})
