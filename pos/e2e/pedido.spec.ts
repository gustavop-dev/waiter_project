import { expect, test } from '@playwright/test'

import { createOrder, loginAsAdmin } from './helpers/odoo'

// @flow: order-wizard-to-kitchen  @outcome: success
// El asistente del kit de punta a punta: cliente, mesa libre, plato con adición y dos unidades, resumen y
// envío a cocina. Después el plano lo muestra en progreso y Pedidos lo lista sin poder cobrarse todavía.
test('the wizard opens a free table, adds two burgers and sends them to the kitchen', async ({ page }) => {
  await loginAsAdmin(page)
  const customer = `Pedido ${Date.now().toString().slice(-6)}`
  const mesa = await createOrder(page, { customer, qty: 2 })

  await page.goto('/salon')
  await expect(page.getByRole('button', { name: new RegExp(`^Mesa ${mesa}: En progreso`) })).toBeVisible()

  await page.goto('/pedidos')
  const card = page.getByRole('article').filter({ hasText: customer })
  await expect(card).toContainText('Hamburguesa Angus')
  await expect(card).toContainText('2 ítems')
  // Cobrar sigue apagado: nada se ha entregado en la mesa.
  await expect(card.getByRole('button', { name: 'Cobrar' })).toBeDisabled()
})
