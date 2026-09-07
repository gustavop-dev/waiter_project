import { expect, test } from '@playwright/test'

import { chargeTable, createOrder, kitchenReadyAndServe, loginAsAdmin } from './helpers/odoo'

// @flow: kitchen-ready-served  @outcome: success
// El relevo entre cocina y sala: cocina marca la comanda lista y la entrega desde "Listos por entregar";
// el plano pasa la mesa a Servido y solo entonces se puede cobrar.
test('kitchen marks a ticket ready and served; the salon shows it served and charges it', async ({ page }) => {
  await loginAsAdmin(page)
  const customer = `Cocina ${Date.now().toString().slice(-6)}`
  const mesa = await createOrder(page, { customer, qty: 2 })

  // Antes de que cocina diga nada, la mesa está en progreso y no hay nada que cobrar.
  await page.goto('/salon')
  await expect(page.getByRole('button', { name: new RegExp(`^Mesa ${mesa}: En progreso`) })).toBeVisible()

  await kitchenReadyAndServe(page, mesa)

  await page.goto('/salon')
  await expect(page.getByRole('button', { name: new RegExp(`^Mesa ${mesa}: Servido`) })).toBeVisible({ timeout: 30_000 })
  await chargeTable(page, mesa)
})
