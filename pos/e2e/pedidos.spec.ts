import { expect, test } from '@playwright/test'

import { chargeTable, createOrder, kitchenReadyAndServe, loginAsAdmin } from './helpers/odoo'

// @flow: kit-orders  @outcome: success
// Recorrido de las cuatro pantallas del kit sobre un mismo pedido: Inicio lo muestra en progreso, Pedidos lo
// lista y abre su detalle, "Nuevo pedido" agrega una ronda que va a cocina, e Historial muestra su cuenta.
test('dashboard, orders, detail, add round and history follow the kit', async ({ page }) => {
  // Cinco pantallas más el cobro: no cabe en el minuto por defecto.
  test.setTimeout(180_000)
  await loginAsAdmin(page)
  const customer = `Recorrido ${Date.now().toString().slice(-6)}`
  const mesa = await createOrder(page, { customer })

  await page.goto('/dashboard')
  const dashCard = page.getByRole('region', { name: 'En progreso' }).getByRole('article').filter({ hasText: customer })
  await expect(dashCard).toContainText('En progreso')
  await expect(dashCard).toContainText('1 ítems')
  // La mesa ya no se ofrece como libre en el panel de la derecha.
  await expect(page.getByRole('region', { name: 'Mesas disponibles' })).not.toContainText(new RegExp(`^${mesa}$`))

  await page.getByRole('link', { name: 'Pedidos' }).click()
  await expect(page).toHaveURL(/\/pedidos$/)
  const card = page.getByRole('article').filter({ hasText: customer })
  await expect(card).toContainText('Hamburguesa Angus')
  await expect(card.getByRole('button', { name: 'Cobrar' })).toBeDisabled()
  // Al detalle se entra por la flecha de "N ítems"; el pie de la tarjeta es para pedir otra ronda.
  await card.getByRole('button', { name: /ítems/ }).click()
  const detail = page.getByRole('dialog', { name: 'Detalle del pedido' })
  await expect(detail.getByRole('region', { name: 'Esperando cocina' })).toContainText('Hamburguesa Angus')
  await detail.getByRole('button', { name: 'Cerrar' }).click()
  await card.getByRole('link', { name: 'Nuevo pedido' }).click()
  await expect(page).toHaveURL(/\/pedidos\/\d+\/agregar$/)

  await page.getByRole('article', { name: 'Papas Trufadas' }).getByRole('button', { name: 'Agregar' }).click()
  const cart = page.getByRole('complementary', { name: 'Nueva ronda' })
  await expect(cart.getByRole('listitem', { name: 'Papas Trufadas' })).toBeVisible()
  await cart.getByRole('button', { name: 'Guardar y enviar a cocina' }).click()
  // El aviso "va a cocina" se desvanece solo; lo que se comprueba es el resultado: vuelve a Pedidos con la ronda dentro.
  await expect(page).toHaveURL(/\/pedidos$/)
  await expect(card).toContainText('Papas Trufadas')

  await page.getByRole('link', { name: 'Historial' }).click()
  await page.getByRole('button', { name: /^Pedido# (DI|TA|DE)\d+/ }).first().click()
  await expect(page.getByRole('complementary', { name: 'Información de la cuenta' })).toContainText('Total a pagar')

  // Se deja la mesa como se encontró: cocina entrega las dos rondas y se cobra.
  await kitchenReadyAndServe(page, mesa)
  await chargeTable(page, mesa)
})
