import { expect, test } from '@playwright/test'

import { createOrder, loginAs, loginAsAdmin } from './helpers/odoo'

// @flow: live-updates  @outcome: success
// El bus tiene que estar vivo y ser el que mueve las pantallas. Si algún día vuelve a mover el sondeo,
// esta prueba lo dice: el sondeo tarda diez segundos y aquí solo hay cinco. Es lo que impide que un
// retraso se vuelva a colar sin que nadie se entere.
test('the kitchen reaches the waiter over the live bus, not the poll', async ({ page, browser }) => {
  const sockets: string[] = []
  page.on('websocket', (ws) => sockets.push(ws.url()))
  await loginAs(page, 'admin', 'admin')
  const customer = `Bus ${Date.now().toString().slice(-6)}`
  const mesa = await createOrder(page, { customer })
  expect(sockets.some((u) => u.includes('/odoo/websocket'))).toBe(true)

  const kitchen = await browser.newContext()
  const kds = await kitchen.newPage()
  await loginAsAdmin(kds)
  await kds.goto('/kds')
  const ticket = kds.getByRole('article', { name: `Mesa ${mesa}` }).first()
  await expect(ticket).toBeVisible({ timeout: 30_000 })

  // El mesero mira su pase mientras cocina saca el plato: tiene que aparecer sin esperar a ningún reloj.
  await page.goto('/dashboard')
  const panel = page.getByRole('region', { name: 'Listos para servir' })
  await expect(panel).toBeVisible()
  await expect(panel).not.toContainText(customer)
  await ticket.getByRole('button', { name: 'Listo todo' }).click()
  await expect(panel).toContainText(customer, { timeout: 5_000 })

  await kitchen.close()
})
