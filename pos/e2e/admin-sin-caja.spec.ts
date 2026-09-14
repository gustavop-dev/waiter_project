import { expect, test, type Page } from '@playwright/test'
import { startShiftAs, DEMO_ADMIN } from './helpers/odoo'

async function rpc<T>(page: Page, model: string, method: string, args: unknown[]): Promise<T> {
  return page.evaluate(async ({ model, method, args }) => {
    const response = await fetch('/odoo/web/dataset/call_kw', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', method: 'call', params: { model, method, args, kwargs: {} }, id: 1 }) })
    const data = await response.json()
    if (data.error) throw new Error(data.error.data?.message ?? data.error.message)
    return data.result
  }, { model, method, args })
}

test('administrator edits floors and inventory without opening cash', async ({ page }) => {
  test.setTimeout(180_000)
  await page.goto('/login')
  await page.getByLabel('Correo').fill('admin')
  await page.getByLabel('Contraseña').fill('admin')
  await page.getByRole('button', { name: /Entrar|Abrir mi turno/ }).click()
  await startShiftAs(page, DEMO_ADMIN.name, DEMO_ADMIN.pin)
  const opened = await rpc<number>(page, 'pos.session', 'search_count', [[['state', '!=', 'closed']]])
  test.skip(opened !== 0, 'Este recorrido requiere la caja cerrada; no cierra un turno existente.')
  await expect(page).toHaveURL(/\/caja$/)
  await page.getByRole('link', { name: 'Entrar a administración sin abrir caja' }).click()
  await expect(page.getByText('Administración · Caja cerrada')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Pedidos', exact: true })).toHaveCount(0)
  await page.reload()
  await expect(page.getByText('Administración · Caja cerrada')).toBeVisible()

  const [floor] = await rpc<{ id: number; name: string }[]>(page, 'restaurant.floor', 'search_read', [[], ['name']])
  try {
    await page.goto('/salon')
    await page.getByRole('button', { name: 'Ajustes de mesas' }).click()
    await page.getByRole('button', { name: `Editar piso ${floor.name}` }).click()
    await page.getByLabel('Nombre del piso').fill('Prueba administración')
    await page.getByRole('button', { name: 'Guardar', exact: true }).click()
    await expect(page.getByText('Plano guardado', { exact: true })).toBeVisible()
    expect((await rpc<{ name: string }[]>(page, 'restaurant.floor', 'read', [[floor.id], ['name']]))[0].name).toBe('Prueba administración')
  } finally {
    await rpc(page, 'restaurant.floor', 'write', [[floor.id], { name: floor.name }])
  }

  await page.goto('/inventario')
  await expect(page.getByRole('heading', { name: 'Lista del menú' })).toBeVisible()
  await page.getByRole('tab', { name: 'Ingredientes' }).click()
  await page.getByRole('button', { name: 'Más opciones de Salmón fresco' }).click()
  await page.getByRole('menuitem', { name: 'Editar ingrediente', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Editar ingrediente' })
  await expect(dialog.getByPlaceholder('Escribe el nombre del ingrediente')).toHaveValue('Salmón fresco')
  await dialog.getByRole('button', { name: 'Guardar y continuar' }).click()
  await dialog.getByRole('button', { name: 'Guardar y enviar' }).click()
  await expect(dialog).toHaveCount(0)
  expect(await rpc(page, 'pos.session', 'search_count', [[['state', '!=', 'closed']]])).toBe(0)
  await page.goto('/pedidos/nuevo')
  await expect(page).toHaveURL(/\/caja$/)
  await expect(page.getByRole('link', { name: 'Entrar a administración sin abrir caja' })).toBeVisible()
})
