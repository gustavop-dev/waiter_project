import { expect, test } from '@playwright/test'

import { createOrder, DEMO_EMPLOYEE, loginAs, loginAsAdmin } from './helpers/odoo'

// @flow: waiter-order-to-served  @outcome: success
// El viaje completo de un plato visto por el mesero: sale a cocina, cocina lo marca listo, aparece en
// "Listos para servir" y solo cuando el mesero lo entrega el pedido se puede cobrar.
test('un plato viaja de cocina al pase y de ahí a la mesa', async ({ page, browser }) => {
  await loginAs(page, 'admin', 'admin')
  const customer = `Mesero ${Date.now().toString().slice(-6)}`
  const mesa = await createOrder(page, { customer })

  // Mientras cocina no diga nada, el plato está "En cocina" y no hay nada que llevar.
  await page.goto('/pedidos')
  const card = page.getByRole('article').filter({ hasText: customer })
  await expect(card).toContainText('Cocina')
  await page.goto('/dashboard')
  const panel = page.getByRole('region', { name: 'Listos para servir' })
  await expect(panel).not.toContainText(customer)

  // La cocina es otro dispositivo y otro rol: quien lo abre marca el PIN de la encargada.
  const kitchen = await browser.newContext()
  const kds = await kitchen.newPage()
  await loginAsAdmin(kds)
  await kds.goto('/kds')
  const ticket = kds.getByRole('article', { name: `Mesa ${mesa}` }).first()
  await expect(ticket).toContainText('Hamburguesa Angus')
  await ticket.getByRole('button', { name: 'Listo' }).click()

  // El plano lo canta en verde: esa mesa reclama al mesero desde el otro lado del salón.
  await page.goto('/salon')
  await expect(page.getByRole('button', { name: `Mesa ${mesa}: Listo para servir` })).toBeVisible({ timeout: 30_000 })

  // En la tablet del mesero el plato aparece solo en el pase, con su mesa y su botón de entregar.
  await page.goto('/dashboard')
  await expect(panel).toContainText(customer, { timeout: 30_000 })
  const dish = panel.getByRole('listitem').filter({ hasText: customer })
  await expect(dish).toContainText('Hamburguesa Angus')
  await dish.getByRole('button', { name: 'Entregar en la mesa' }).click()
  await expect(panel).not.toContainText(customer, { timeout: 30_000 })

  // Entregado queda en Odoo, no en esta pantalla: se comprueba desde Pedidos, ya cobrable.
  await page.goto('/pedidos')
  await expect(card).toContainText('Servido')
  await expect(card.getByRole('link', { name: 'Cobrar' })).toBeVisible()
  await kitchen.close()
})

// @flow: waiter-floor-settings  @outcome: blocked
// Los pisos son configuración del local: la mesera no tiene el engranaje, y quien sí lo tiene recibe una
// explicación —no una pantalla de error— si intenta tocarlos con la caja abierta.
test('la mesera no puede tocar los pisos', async ({ page }) => {
  await loginAs(page, 'admin', 'admin', DEMO_EMPLOYEE.name, DEMO_EMPLOYEE.pin)
  await expect(page.getByRole('button', { name: 'Ajustes de mesas' })).toHaveCount(0)
})
