import { expect, test } from '@playwright/test'

import { loginAsAdmin } from './helpers/odoo'

// @flow: kit-orders  @outcome: success
// Dashboard muestra el pedido en progreso; Pedidos lo lista y abre el detalle; Agregar ronda la envía a cocina;
// Historial muestra un pedido pagado. Al final se cobra el pedido para dejar la mesa 7 libre.
test('dashboard, orders, detail, add round and history follow the kit', async ({ page }) => {
  await loginAsAdmin(page)
  await page.getByRole('button', { name: /^7\b.*Libre/ }).click()
  await page.getByText('Toca una mesa para ver su cuenta').waitFor({ state: 'hidden' })
  await page.getByRole('button', { name: /Mesa 7/ }).click()
  await page.getByRole('region', { name: 'Carta' }).getByRole('button', { name: /Hamburguesa Angus/ }).click()
  await page.getByRole('button', { name: 'Enviar a cocina' }).click()
  await page.waitForURL('**/salon')

  await page.goto('/dashboard')
  const inProgress = page.getByRole('region', { name: 'En progreso' })
  const dashCard = inProgress.getByRole('article').filter({ has: page.getByLabel('Mesa 7') })
  await expect(dashCard).toContainText('En progreso')
  await expect(dashCard).toContainText('1 ítems')
  await expect(page.getByRole('region', { name: 'Mesas disponibles' })).not.toContainText(/^7$/)

  await page.getByRole('link', { name: 'Pedidos' }).click()
  await expect(page).toHaveURL(/\/pedidos$/)
  const card = page.getByRole('article').filter({ has: page.getByLabel('Mesa 7') })
  await expect(card).toContainText('Hamburguesa Angus')
  await expect(card.getByRole('button', { name: 'Cobrar' })).toBeDisabled()
  await card.getByRole('button', { name: 'Ver detalle' }).click()
  const detail = page.getByRole('dialog', { name: 'Detalle del pedido' })
  await expect(detail.getByRole('region', { name: 'En progreso' })).toContainText('Hamburguesa Angus')
  await detail.getByRole('link', { name: 'Nuevo pedido' }).click()
  await expect(page).toHaveURL(/\/pedidos\/\d+\/agregar$/)

  await page.getByRole('article', { name: 'Papas Trufadas' }).getByRole('button', { name: 'Agregar' }).click()
  const cart = page.getByRole('complementary', { name: 'Nueva ronda' })
  await expect(cart.getByRole('listitem', { name: 'Papas Trufadas' })).toBeVisible()
  await cart.getByRole('button', { name: 'Guardar y enviar a cocina' }).click()
  await expect(page.getByRole('status').first()).toContainText('va a cocina')
  await expect(page).toHaveURL(/\/pedidos$/)
  await expect(card).toContainText('Papas Trufadas')

  await page.getByRole('link', { name: 'Historial' }).click()
  await page.getByRole('button', { name: /^Pedido# (DI|TA|DE)\d+/ }).first().click()
  await expect(page.getByRole('complementary', { name: 'Información de la cuenta' })).toContainText('Total a pagar')

  await page.goto('/salon')
  await page.getByRole('button', { name: /^7\b.*En cocina/ }).click()
  await page.getByRole('button', { name: /^Cobrar \$/ }).click()
  await page.getByRole('button', { name: 'Agregar pago' }).click()
  await page.getByRole('button', { name: 'Confirmar cobro' }).click()
  await page.getByRole('button', { name: 'Cerrar' }).click()
  await expect(page.getByRole('button', { name: /^7\b.*Libre/ })).toBeVisible()
})
