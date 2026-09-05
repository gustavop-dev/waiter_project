import { expect, test } from '@playwright/test'

const TABLE = '/burger-house/poblado/t/Z2XUVG/'

// @flow: diner-orders-from-table  @outcome: success
test('a diner at the table browses, orders with a note, sends to the kitchen and asks for the bill', async ({ page }) => {
  await page.goto(TABLE)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Buen/)
  await expect(page.getByText('Mesa 9')).toBeVisible()
  await page.getByRole('button', { name: 'Ver la carta' }).click()
  await page.getByLabel('Buscar un plato').fill('limon')
  await expect(page.getByText('Hamburguesa Angus')).toHaveCount(0)
  await page.getByText('Limonada de Coco').first().click()
  await page.getByRole('button', { name: 'Más' }).click()
  await page.getByLabel(/Nota para la cocina/).fill('sin hielo')
  await page.getByRole('button', { name: /^Agregar · / }).click()
  await page.getByRole('link', { name: 'Tu pedido' }).click()
  await expect(page.getByText('sin hielo')).toBeVisible()
  await page.getByRole('button', { name: /^Enviar a cocina/ }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(/Recibido|En cocina/)
  await page.getByRole('button', { name: 'Pedir la cuenta' }).click()
  await expect(page.getByRole('status')).toHaveText(/trae la cuenta/)
  await expect(page.getByText(/^\$ \d/).first()).toBeVisible()
})
