import { expect, test } from '@playwright/test'

import { createOrder, loginAsAdmin } from './helpers/odoo'

// @flow: search-dish-and-kitchen-note  @outcome: success
// El buscador del menú deja solo lo que se busca, y la nota que el mesero escribe en el plato viaja hasta
// la comanda de cocina: es la única forma que tiene la cocina de enterarse de una alergia.
test('the waiter searches a dish, adds a kitchen note and the KDS shows it', async ({ page }) => {
  await loginAsAdmin(page)

  // El buscador filtra de verdad: con "limon" la hamburguesa desaparece de la lista.
  await page.goto('/pedidos/nuevo')
  await page.getByLabel('Nombre del cliente').fill('Filtro')
  await page.getByRole('button', { name: 'Continuar' }).click()
  await page.locator('button[aria-pressed="false"]:not([disabled])').filter({ hasText: 'Mesa' }).first().click()
  await page.getByRole('button', { name: 'Continuar' }).click()
  const menu = page.getByRole('region', { name: 'Lista del menú' })
  await page.getByPlaceholder('Buscar plato').fill('limon')
  await expect(menu.getByText('Limonada', { exact: false }).first()).toBeVisible()
  await expect(menu.getByText('Hamburguesa Angus')).toHaveCount(0)

  const customer = `Nota ${Date.now().toString().slice(-6)}`
  const mesa = await createOrder(page, { customer, dish: 'Limonada', note: 'sin hielo, alergia' })

  await page.goto('/kds')
  const ticket = page.getByRole('article', { name: `Mesa ${mesa}` }).first()
  await expect(ticket).toContainText('Limonada')
  await expect(ticket).toContainText('sin hielo, alergia')
})
