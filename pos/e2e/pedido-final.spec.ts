import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/odoo'

// @flow: search-dish-and-kitchen-note  @outcome: success
test('the waiter searches a dish, adds a general kitchen note and the KDS shows it', async ({ page }) => {
  await loginAsAdmin(page)
  await page.getByRole('button', { name: /^Mesa 6: Disponible/ }).click()
  await page.getByRole('button', { name: 'Abrir pedido' }).click()
  await page.waitForURL('**/mesas/**')
  const carta = page.getByRole('region', { name: 'Carta' })
  await page.getByLabel('Buscar plato').fill('limon')
  await expect(carta.getByRole('button', { name: /Hamburguesa Angus/ })).toHaveCount(0)
  await carta.getByRole('button', { name: /Limonada/ }).click()
  await page.getByRole('button', { name: /Nota a cocina/ }).click()
  await page.getByRole('dialog').getByLabel('Nota general a cocina').fill('sin hielo, alergia')
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar' }).click()
  await page.getByRole('button', { name: 'Enviar a cocina' }).click()
  await page.waitForURL('**/salon')
  await page.goto('/kds')
  const ticket = page.getByRole('article', { name: 'Mesa 6' })
  await expect(ticket).toContainText('sin hielo, alergia')
  await ticket.getByRole('button', { name: 'Listo' }).click()
  await page.getByRole('complementary').getByRole('button', { name: /Mesa 6/ }).click()
  await page.goto('/salon')
  await page.getByLabel('Buscar mesa o pedido').fill('6')
  await expect(page.getByRole('button', { name: /^Mesa 1: Disponible/ })).toHaveCount(0)
  await page.getByRole('button', { name: /^Mesa 6: Servido/ }).click()
  await page.getByRole('button', { name: /^Cobrar/ }).click()
  await page.getByRole('button', { name: 'Agregar pago' }).click()
  await page.getByRole('button', { name: 'Confirmar cobro' }).click()
  await page.getByRole('button', { name: 'Cerrar' }).click()
})
