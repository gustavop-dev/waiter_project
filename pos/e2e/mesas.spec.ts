import { expect, test, type Page } from '@playwright/test'

import { loginAsAdmin } from './helpers/odoo'

// Odoo por el proxy de Next con la cookie de la sesión del navegador (page.request la comparte).
async function odoo<T>(page: Page, model: string, method: string, args: unknown[], kwargs: Record<string, unknown> = {}): Promise<T> {
  const res = await page.request.post('/odoo/web/dataset/call_kw', { data: { jsonrpc: '2.0', method: 'call', id: 1, params: { model, method, args, kwargs } } })
  const body = await res.json()
  if (body.error) throw new Error(body.error.data?.message ?? body.error.message)
  return body.result as T
}
async function terrazaTable(page: Page, number: number): Promise<number> {
  const [row] = await odoo<{ id: number }[]>(page, 'restaurant.table', 'search_read', [[['floor_id.name', '=', 'Terraza'], ['table_number', '=', number]], ['id']])
  return row.id
}
// La base demo es compartida: un run anterior pudo dejar un pedido abierto en las mesas del test. Se borran solo esos.
async function clearDraftOrders(page: Page, tableIds: number[]) {
  const ids = await odoo<number[]>(page, 'pos.order', 'search', [[['table_id', 'in', tableIds], ['state', '=', 'draft']]])
  if (ids.length > 0) await odoo(page, 'pos.order', 'unlink', [ids]).catch(() => undefined)
}
async function dragTemplate(page: Page, name: string, x: number, y: number, tableName: string) {
  const palette = (await page.getByRole('button', { name }).boundingBox())!
  const canvas = (await page.getByTestId('layout-canvas').boundingBox())!
  await page.mouse.move(palette.x + palette.width / 2, palette.y + palette.height / 2)
  await page.mouse.down()
  await page.mouse.move(canvas.x + x, canvas.y + y, { steps: 8 })
  await page.mouse.up()
  await page.getByRole('textbox', { name: 'Nombre de la mesa' }).fill(tableName)
  await page.getByRole('button', { name: 'Confirmar' }).click()
}

// @flow: tables-create-floor-by-drag  @outcome: success
test('the admin adds a floor with two tables dragged onto the layout and then deactivates it', async ({ page }) => {
  const stamp = 900 + (Date.now() % 9000)
  await loginAsAdmin(page)
  await page.getByRole('button', { name: 'Ajustes de mesas' }).click()
  await page.getByRole('button', { name: 'Agregar piso' }).click()
  const wizard = page.getByRole('dialog', { name: 'Agregar plano' })
  await wizard.getByPlaceholder('Escribe el número o el nombre del piso').fill(String(stamp))
  await wizard.getByRole('radio', { name: 'Exterior' }).click()
  await wizard.getByRole('button', { name: 'Siguiente' }).click()
  await dragTemplate(page, 'Mesa pequeña', 160, 140, '1')
  await dragTemplate(page, 'Mesa grande (H)', 520, 140, 'Mesa 2')
  await expect(page.getByRole('button', { name: 'Mover mesa 2' })).toBeVisible()
  await wizard.getByRole('button', { name: 'Siguiente' }).click()
  await expect(wizard.getByText('Mesas creadas con éxito')).toBeVisible()
  await expect(wizard.getByText('Mesas grandes').locator('xpath=following-sibling::dd[1]')).toHaveText('1')
  await expect(wizard.getByText('Total de mesas').locator('xpath=following-sibling::dd[1]')).toHaveText('2')
  await wizard.getByRole('button', { name: 'Ir a mesas' }).click()
  await expect(page.getByRole('button', { name: 'Mesa 1: Disponible' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Mesa 2: Disponible' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ver detalle del piso' })).toContainText('Exterior')
  // Limpieza: el piso del test se desactiva desde el mismo engranaje (queda archivado, no borrado).
  await page.getByRole('button', { name: 'Ajustes de mesas' }).click()
  await page.getByRole('switch', { name: `Piso ${stamp} activo` }).click()
  await expect(page.getByRole('switch', { name: `Piso ${stamp} activo` })).toHaveAttribute('aria-checked', 'false')
})

// @flow: tables-move-order  @outcome: success
test('a waiter moves an order in progress to a free table through the table detail', async ({ page }) => {
  await loginAsAdmin(page)
  const from = await terrazaTable(page, 11)
  await clearDraftOrders(page, [from])
  await page.goto(`/mesas/${from}`)
  await page.getByRole('region', { name: 'Carta' }).getByRole('button', { name: /Hamburguesa Angus/ }).click()
  await page.getByRole('button', { name: 'Enviar a cocina' }).click()
  await page.waitForURL('**/salon')
  await page.getByRole('button', { name: 'Mesa 11: En progreso' }).click()
  await page.getByRole('button', { name: 'Detalle de mesa' }).click()
  const detail = page.getByRole('dialog', { name: 'Detalle de mesa' })
  await expect(detail.getByText('Hamburguesa Angus')).toBeVisible()
  await expect(detail.getByRole('button', { name: 'Ir a pagar' })).toBeDisabled()
  await detail.getByRole('button', { name: 'Cambiar mesa' }).click()
  // Al mover, solo aterriza en una mesa libre: una reservada del día no se puede elegir, así que se
  // toma la primera que el plano deje pulsar en vez de una fija.
  const target = page.getByRole('button', { name: /^Mesa \d+: Disponible/ }).first()
  const numero = ((await target.getAttribute('aria-label')) ?? '').match(/^Mesa (\d+):/)?.[1] ?? ''
  await target.click()
  await page.getByRole('dialog', { name: 'Cambiar mesa' }).getByRole('button', { name: 'Confirmar cambio' }).click()
  await expect(page.getByRole('button', { name: `Mesa ${numero}: En progreso` })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Mesa 11: (Disponible|Reservada)/ })).toBeVisible()
  await clearDraftOrders(page, [from, await terrazaTable(page, Number(numero))])
})
