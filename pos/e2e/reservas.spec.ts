import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/odoo'

// @flow: reservation-create  @outcome: success
// Crea una reserva con un plato pre-pedido y comprueba que aparece en la grilla del día y en su detalle.
test('a reservation with a preordered dish lands on the timeline', async ({ page }) => {
  await loginAsAdmin(page)
  await page.getByRole('link', { name: 'Reservas' }).click()
  await expect(page.getByRole('button', { name: 'Nueva reserva' })).toBeVisible()

  await page.getByRole('button', { name: 'Nueva reserva' }).click()
  const customer = `E2E ${Date.now().toString().slice(-6)}`
  await page.getByLabel('Nombre del cliente').fill(customer)
  await page.locator('label:has-text("Fecha y hora") button').click()
  await page.getByRole('button', { name: '19:30' }).click()
  await page.getByRole('button', { name: 'Aplicar' }).click()
  await page.getByRole('button', { name: 'Continuar' }).click()

  // Mesa: la primera libre del piso para esa franja.
  const free = page.locator('button[aria-pressed="false"]:not([disabled])').filter({ hasText: 'personas' }).first()
  await free.click()
  await page.getByRole('button', { name: 'Continuar' }).last().click()

  await page.getByRole('button', { name: 'Agregar' }).first().click()
  const addToCart = page.getByRole('button', { name: /Agregar al carrito/ })
  if (await addToCart.count()) await addToCart.click()
  await page.getByRole('button', { name: /Continuar/ }).last().click()

  await expect(page.getByText('Se asigna al crear')).toBeVisible()
  await page.getByRole('button', { name: 'Crear reserva' }).click()

  await expect(page.getByRole('status')).toContainText('Reserva confirmada')
  const card = page.getByRole('button', { name: new RegExp(customer) })
  await expect(card).toBeVisible()
  await card.click()
  await expect(page.getByRole('dialog', { name: 'Detalle de la reserva' })).toContainText(customer)
})
