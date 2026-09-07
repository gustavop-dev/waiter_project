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

// @flow: kitchen-serves-one-dish  @outcome: success
// La comanda sale por partes: cocina entrega un plato y el otro sigue esperando en el pase.
test('the kitchen hands over one dish at a time', async ({ page }) => {
  await loginAsAdmin(page)
  const customer = `Parcial ${Date.now().toString().slice(-6)}`
  const mesa = await createOrder(page, { customer, dish: ['Hamburguesa Angus', 'Papas Trufadas'] })

  await page.goto('/kds')
  const ticket = page.getByRole('article', { name: `Mesa ${mesa}` }).first()
  await ticket.getByRole('button', { name: 'Listo' }).click()

  const card = page.getByRole('complementary', { name: 'Listos por entregar' }).getByRole('listitem', { name: `Mesa ${mesa}` })
  await expect(card).toContainText('2 platos')
  await card.getByRole('button', { name: 'Entregar' }).first().click()

  // El plato entregado se tacha y deja de contar; la comanda sigue abierta con el que falta.
  await expect(card).toContainText('1 plato')
  await expect(card.getByRole('button', { name: 'Entregar', exact: true })).toHaveCount(1)
  await expect(card.getByText('Entregado')).toBeVisible()

  await card.getByRole('button', { name: 'Entregar todo' }).click()
  await expect(card).toHaveCount(0)
  await chargeTable(page, mesa)
})
