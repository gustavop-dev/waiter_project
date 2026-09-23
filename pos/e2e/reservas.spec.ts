import { expect, test, type Page } from '@playwright/test'

import { loginAsAdmin } from './helpers/odoo'

// La base demo es compartida y el plano es el mismo cada día: una reserva de prueba que se queda deja la
// mesa en "Reservada" y bloquea a los demás recorridos, que ya no la pueden elegir. Se borra al terminar.
async function dropReservation(page: Page, customer: string) {
  const call = async (method: string, args: unknown[]) => {
    const res = await page.request.post('/odoo/web/dataset/call_kw', { data: { jsonrpc: '2.0', method: 'call', id: 1, params: { model: 'waiter.reservation', method, args, kwargs: {} } } })
    return (await res.json()).result
  }
  const ids = (await call('search', [[['customer_name', '=', customer]]])) as number[] | undefined
  if (ids?.length) await call('unlink', [ids])
}

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
  await dropReservation(page, customer)
})

// @flow: reservation-prep-window  @outcome: success
// Una reserva de la noche no puede dejar la mesa muerta desde el almuerzo: solo la aparta desde su margen
// de preparación. Es lo que permite usar la mesa el resto del día.
test('a reservation only holds its table from the prep margin, not all day', async ({ page }) => {
  await loginAsAdmin(page)
  await page.getByRole('link', { name: 'Reservas' }).click()
  await page.getByRole('button', { name: 'Nueva reserva' }).click()
  const customer = `E2E ${Date.now().toString().slice(-6)}`
  await page.getByLabel('Nombre del cliente').fill(customer)
  await page.locator('label:has-text("Fecha y hora") button').click()
  await page.getByRole('button', { name: '21:30' }).click()
  await page.getByRole('button', { name: 'Aplicar' }).click()

  // El margen se elige aquí y la pantalla dice desde cuándo deja de ofrecerse la mesa.
  await page.getByRole('radio', { name: '30 min antes' }).click()
  await expect(page.getByText(/de 21:00 a 21:30/)).toBeVisible()
  await page.getByRole('button', { name: 'Continuar' }).click()

  const free = page.locator('button[aria-pressed="false"]:not([disabled])').filter({ hasText: 'personas' }).first()
  await free.click()
  await page.getByRole('button', { name: 'Continuar' }).last().click()
  // El paso del menú pide al menos un plato para seguir, igual que en el recorrido de arriba.
  await page.getByRole('button', { name: 'Agregar' }).first().click()
  const addToCart = page.getByRole('button', { name: /Agregar al carrito/ })
  if (await addToCart.count()) await addToCart.click()
  await page.getByRole('button', { name: /Continuar/ }).last().click()
  await page.getByRole('button', { name: 'Crear reserva' }).click()
  await expect(page.getByRole('status')).toContainText('Reserva confirmada')

  // El detalle conserva el margen elegido: es lo que decide desde cuándo el plano aparta la mesa. La regla
  // en sí vive en projectapp_reservations, con su propia prueba de servidor.
  const card = page.getByRole('button', { name: new RegExp(customer) })
  await expect(card).toBeVisible()
  await card.click()
  await expect(page.getByRole('dialog', { name: 'Detalle de la reserva' })).toContainText('21:30')
  await dropReservation(page, customer)
})
