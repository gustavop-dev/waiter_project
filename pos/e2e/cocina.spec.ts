import { expect, test } from '@playwright/test'

import { chargeTable, createOrder, deliverTable, kitchenReady, loginAsAdmin } from './helpers/odoo'

// @flow: kitchen-ready-served  @outcome: success
// El relevo entre cocina y sala: cocina saca la comanda al pase, el mesero la lleva a la mesa y solo
// entonces se puede cobrar.
test('kitchen marks a ticket ready and served; the salon shows it served and charges it', async ({ page }) => {
  await loginAsAdmin(page)
  const customer = `Cocina ${Date.now().toString().slice(-6)}`
  const mesa = await createOrder(page, { customer, qty: 2 })

  // Antes de que cocina diga nada, la mesa está en progreso y no hay nada que cobrar.
  await page.goto('/salon')
  await expect(page.getByRole('button', { name: new RegExp(`^Mesa ${mesa}: En progreso`) })).toBeVisible()

  await kitchenReady(page, mesa)
  await page.goto('/salon')
  await expect(page.getByRole('button', { name: new RegExp(`^Mesa ${mesa}: Listo para servir`) })).toBeVisible({ timeout: 30_000 })

  await deliverTable(page, mesa)
  await page.goto('/salon')
  await expect(page.getByRole('button', { name: new RegExp(`^Mesa ${mesa}: Servido`) })).toBeVisible({ timeout: 30_000 })
  await chargeTable(page, mesa)
})

// @flow: kitchen-sends-one-dish  @outcome: success
// Cocina saca los platos de uno en uno, y el mesero no puede llevar a la mesa lo que sigue en el fuego.
test('the kitchen sends out one dish at a time and the waiter can only take that one', async ({ page }) => {
  await loginAsAdmin(page)
  const customer = `Parcial ${Date.now().toString().slice(-6)}`
  const mesa = await createOrder(page, { customer, dish: ['Hamburguesa Angus', 'Papas Trufadas'] })

  await page.goto('/kds')
  const ticket = page.getByRole('article', { name: `Mesa ${mesa}` }).first()
  await expect(ticket).toContainText('2 platos')
  await expect(ticket).toContainText('Recibida')
  await ticket.getByRole('button', { name: 'Iniciar preparación' }).click()
  await expect(ticket).toContainText('En preparación')
  await ticket.getByRole('button', { name: 'Listo', exact: true }).first().click()

  // El plato que salió se tacha en la comanda y aparece solo él en el pase; el otro sigue en el fuego.
  await expect(ticket).toContainText('1 plato')
  // Acotado a esta mesa: la base demo es compartida y el pase puede tener platos de otras.
  const pass = page.getByRole('complementary', { name: 'Listos por entregar' }).getByRole('listitem', { name: `Mesa ${mesa}` })
  await expect(pass).toHaveCount(1)
  await expect(pass).toContainText('Hamburguesa Angus')

  // En la tablet del mesero solo se puede marcar entregado el que ya está en el pase.
  await page.goto('/pedidos')
  const card = page.getByRole('article').filter({ hasText: customer })
  await expect(card.getByRole('checkbox', { name: /Hamburguesa Angus/ })).toBeEnabled()
  await expect(card.getByRole('checkbox', { name: /Papas Trufadas/ })).toBeDisabled()
  await card.getByRole('checkbox', { name: /Hamburguesa Angus/ }).click()
  await expect(card.getByRole('checkbox', { name: /Hamburguesa Angus/ })).toBeChecked({ timeout: 20_000 })

  // Cocina saca el segundo y ahora sí se puede llevar y cobrar.
  await kitchenReady(page, mesa)
  await deliverTable(page, mesa)
  await chargeTable(page, mesa)
})

// Una comanda recibida se puede retirar sin dejar la mesa ocupada ni un ticket huérfano.
test('waiter cancels a received order before preparation and releases the table', async ({ page }) => {
  test.setTimeout(120_000)
  await loginAsAdmin(page)
  const customer = `Cancelar cocina ${Date.now()}`
  const mesa = await createOrder(page, { customer })
  await page.goto('/kds')
  const ticket = page.getByRole('article', { name: `Mesa ${mesa}` })
  await expect(ticket).toContainText('Recibida')
  await page.goto('/pedidos')
  const card = page.getByRole('article').filter({ hasText: customer })
  await card.getByRole('button', { name: /ítems/ }).click()
  await page.getByRole('dialog', { name: 'Detalle del pedido' }).getByRole('button', { name: 'Cancelar', exact: true }).click()
  await expect(card).toHaveCount(0)
  await page.goto('/kds')
  await expect(ticket).toHaveCount(0)
})
